import express from 'express';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {bundle} from '@remotion/bundler';
import path from 'path';
import fs from 'fs/promises';
import {createReadStream} from 'fs';
import {execFile} from 'child_process';
import {promisify} from 'util';
import {google} from 'googleapis';
import {v2 as cloudinary} from 'cloudinary';

const execFileAsync = promisify(execFile);
const FPS = 30;

const app = express();
app.use(express.json());

// First route: so http://localhost:8080 works in browser
app.get('/', (req, res) => {
  res.send(
    'Server is running. POST /render (lines only) or /render-edit (videoUrl + lines) to generate or edit a video.'
  );
});

let bundledLocation: string | null = null;

function getDriveClient(): ReturnType<typeof google.drive> | null {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!email || !key || !folderId) return null;
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    subject: process.env.GOOGLE_IMPERSONATE_USER || undefined,
  });
  return google.drive({version: 'v3', auth});
}

async function getBundle() {
  if (!bundledLocation) {
    bundledLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'src', 'remotion', 'index.ts'),
    });
  }
  return bundledLocation;
}

/** Get video duration in seconds via ffprobe (for EditVideo composition). */
async function getVideoDurationSeconds(videoUrl: string): Promise<number> {
  try {
    const {stdout} = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      videoUrl,
    ]);
    const sec = parseFloat(stdout.trim());
    return Number.isFinite(sec) && sec > 0 ? sec : 30;
  } catch {
    return 30;
  }
}

app.post('/render', async (req, res) => {
  console.log('POST /render received');
  try {
    const {lines} = req.body as {lines: string[]};
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({error: 'lines_required'});
    }

    const serveUrl = await getBundle();
    const composition = await selectComposition({
      serveUrl,
      id: 'SimpleVideo',
      inputProps: {lines},
    });
    const outDir = path.join(process.cwd(), 'out');
    await fs.mkdir(outDir, {recursive: true});
    const output = path.join(outDir, `video-${Date.now()}.mp4`);

    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: output,
      inputProps: {lines},
    });

    // Optional: upload to Cloudinary (no quota issues; set CLOUDINARY_* env vars)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret});
      const result = await cloudinary.uploader.upload(output, {
        resource_type: 'video',
        folder: process.env.CLOUDINARY_FOLDER || 'ai-video',
      });
      await fs.unlink(output).catch(() => {});
      return res.json({
        status: 'ok',
        outputPath: output,
        videoUrl: result.secure_url,
      });
    }

    // Optional: upload to Google Drive (set env vars on Railway to get shareable link)
    const drive = getDriveClient();
    if (drive) {
      try {
        const fileName = `ai-video-${Date.now()}.mp4`;
        const {data: file} = await drive.files.create({
          requestBody: {name: fileName, parents: [process.env.DRIVE_FOLDER_ID!]},
          media: {mimeType: 'video/mp4', body: createReadStream(output)},
          fields: 'id, webViewLink, webContentLink',
          supportsAllDrives: true,
        });
        await drive.permissions.create({
          fileId: file.id!,
          requestBody: {role: 'reader', type: 'anyone'},
          supportsAllDrives: true,
        });
        await fs.unlink(output).catch(() => {});
        return res.json({
          status: 'ok',
          outputPath: output,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
        });
      } catch (driveErr: unknown) {
        const msg = driveErr instanceof Error ? driveErr.message : String(driveErr);
        if (msg.includes('storage quota') || msg.includes('do not have storage quota')) {
          await fs.unlink(output).catch(() => {});
          return res.json({
            status: 'ok',
            outputPath: output,
            driveUpload: 'skipped',
            message: 'Video rendered. Drive upload failed (service account quota). Use a Workspace Shared Drive or omit Drive env vars.',
          });
        }
        throw driveErr;
      }
    }

    return res.json({
      status: 'ok',
      outputPath: output,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Render error:', message);
    if (stack) console.error(stack);
    // Ensure client gets the message so you can see it in the other PowerShell
    return res.status(500).json({
      error: 'render_failed',
      message,
    });
  }
});

/**
 * Edit an existing video (e.g. from Seed Dance 2): add caption overlays and upload to Cloudinary/Drive.
 * Body: { videoUrl, lines, durationSeconds?, musicUrl?, voiceoverUrl?, logoUrl?, primaryColor? }
 * All of musicUrl, voiceoverUrl, logoUrl, primaryColor are optional; omit and flow is unchanged.
 */
app.post('/render-edit', async (req, res) => {
  console.log('POST /render-edit received');
  try {
    const {
      videoUrl,
      lines,
      durationSeconds: bodyDuration,
      musicUrl,
      voiceoverUrl,
      logoUrl,
      primaryColor,
    } = req.body as {
      videoUrl?: string;
      lines?: string[];
      durationSeconds?: number;
      musicUrl?: string;
      voiceoverUrl?: string;
      logoUrl?: string;
      primaryColor?: string;
    };
    if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim() === '') {
      return res.status(400).json({error: 'videoUrl_required'});
    }
    const captionLines = Array.isArray(lines) && lines.length > 0 ? lines : [''];

    const durationSeconds =
      typeof bodyDuration === 'number' && bodyDuration > 0
        ? bodyDuration
        : await getVideoDurationSeconds(videoUrl.trim());
    const durationInFrames = Math.ceil(durationSeconds * FPS);

    const inputProps: Record<string, unknown> = {
      videoUrl: videoUrl.trim(),
      lines: captionLines,
      durationInFrames,
    };
    if (typeof musicUrl === 'string' && musicUrl.trim()) inputProps.musicUrl = musicUrl.trim();
    if (typeof voiceoverUrl === 'string' && voiceoverUrl.trim()) inputProps.voiceoverUrl = voiceoverUrl.trim();
    if (typeof logoUrl === 'string' && logoUrl.trim()) inputProps.logoUrl = logoUrl.trim();
    if (typeof primaryColor === 'string' && primaryColor.trim()) inputProps.primaryColor = primaryColor.trim();

    const serveUrl = await getBundle();
    const composition = await selectComposition({
      serveUrl,
      id: 'EditVideo',
      inputProps,
    });
    const outDir = path.join(process.cwd(), 'out');
    await fs.mkdir(outDir, {recursive: true});
    const output = path.join(outDir, `edit-${Date.now()}.mp4`);

    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: output,
      inputProps,
    });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret});
      const result = await cloudinary.uploader.upload(output, {
        resource_type: 'video',
        folder: process.env.CLOUDINARY_FOLDER || 'ai-video',
      });
      await fs.unlink(output).catch(() => {});
      return res.json({
        status: 'ok',
        outputPath: output,
        videoUrl: result.secure_url,
      });
    }

    const drive = getDriveClient();
    if (drive) {
      try {
        const fileName = `ai-video-edit-${Date.now()}.mp4`;
        const {data: file} = await drive.files.create({
          requestBody: {name: fileName, parents: [process.env.DRIVE_FOLDER_ID!]},
          media: {mimeType: 'video/mp4', body: createReadStream(output)},
          fields: 'id, webViewLink, webContentLink',
          supportsAllDrives: true,
        });
        await drive.permissions.create({
          fileId: file.id!,
          requestBody: {role: 'reader', type: 'anyone'},
          supportsAllDrives: true,
        });
        await fs.unlink(output).catch(() => {});
        return res.json({
          status: 'ok',
          outputPath: output,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
        });
      } catch (driveErr: unknown) {
        const msg = driveErr instanceof Error ? driveErr.message : String(driveErr);
        if (msg.includes('storage quota') || msg.includes('do not have storage quota')) {
          await fs.unlink(output).catch(() => {});
          return res.json({
            status: 'ok',
            outputPath: output,
            driveUpload: 'skipped',
            message: 'Video rendered. Drive upload failed (service account quota).',
          });
        }
        throw driveErr;
      }
    }

    return res.json({
      status: 'ok',
      outputPath: output,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Render-edit error:', message);
    if (stack) console.error(stack);
    return res.status(500).json({
      error: 'render_edit_failed',
      message,
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Renderer listening on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser to test.`);
});

