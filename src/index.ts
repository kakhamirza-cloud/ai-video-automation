import express from 'express';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {bundle} from '@remotion/bundler';
import path from 'path';
import fs from 'fs/promises';
import {createReadStream} from 'fs';
import {google} from 'googleapis';
import {v2 as cloudinary} from 'cloudinary';

const app = express();
app.use(express.json());

// First route: so http://localhost:8080 works in browser
app.get('/', (req, res) => {
  res.send('Server is running. POST to /render to generate a video.');
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

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Renderer listening on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser to test.`);
});

