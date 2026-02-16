# AI Video Automation

Node + Remotion server that renders short vertical videos from text lines. Use it locally or deploy to Railway and call it from OpenClaw for full automation: **research trending AI → generate script → render video → save to Google Drive**.

---

## What you need

- **Node.js** (v18+)
- **FFmpeg** on your PATH ([download](https://www.gyan.dev/ffmpeg/builds/), add `bin` to PATH)
- **Railway account** (for cloud deploy)
- **OpenClaw account** (openclaw.ai) + LLM API key
- **Google Drive** – service account + folder ID so Railway can save videos and return a shareable link

---

## 1. Local use (quick test)

### Start the server

```powershell
cd "D:\Cursor Project\ai-video-automation"
npm install
npx ts-node src/index.ts
```

You should see: `Renderer listening on port 8080`. Open **http://localhost:8080** in the browser to confirm.

### Render a video

In **another** PowerShell window:

```powershell
$body = @{ lines = @("Hook about AI","Main point","Second point","Call to action") } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8080/render" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
```

Videos are saved in: **`D:\Cursor Project\ai-video-automation\out\`** (e.g. `video-1739xxxxxx.mp4`).

### Stop the server

In the server window press **Ctrl+C**. If you closed the window without stopping, free the port:

```powershell
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

---

## 2. Deploy to Railway

### Push to GitHub

```powershell
cd "D:\Cursor Project\ai-video-automation"
git init
git add .
git commit -m "AI video renderer"
```

Create a new repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/ai-video-automation.git
git branch -M main
git push -u origin main
```

### Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
2. Select **ai-video-automation**.
3. **Settings** for the service:
   - **Build command:** `npm install`
   - **Start command:** `npx ts-node src/index.ts`
   - **Root directory:** leave default
4. **Variables** (for Google Drive – recommended so videos are saved and you get a link):
   - `GOOGLE_CLIENT_EMAIL` – from your service account JSON
   - `GOOGLE_PRIVATE_KEY` – private key (replace `\n` with real newlines if needed)
   - `DRIVE_FOLDER_ID` – ID of the folder where videos should go (share the folder with the service account email)
   - **`RAILPACK_PACKAGES`** – set to **`ffmpeg`** (required for Remotion to render video on Railway). If you use Nixpacks instead, the repo’s `nixpacks.toml` already adds FFmpeg.
   - `PORT` – Railway sets this automatically; don’t override unless needed.
5. Deploy. Railway will give you a URL like **https://ai-video-automation-production-xxxx.up.railway.app**.

### Test the deployed API

```powershell
$body = @{ lines = @("Hook","Point 1","Point 2","CTA") } | ConvertTo-Json
Invoke-WebRequest -Uri "https://YOUR-RAILWAY-URL.up.railway.app/render" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
```   

If Drive is configured, the JSON response will include `webViewLink` and `webContentLink`. Without Drive, the video is rendered on the server but not stored long-term (ephemeral filesystem).

---

## 3. OpenClaw: full automation

Use OpenClaw to run the full pipeline: **research → script → render → save to Google Drive**.

### Tools to create in OpenClaw

Define these tools (exact names and types depend on your OpenClaw version; adjust to your UI):

| Tool name            | Purpose                    | How it works |
|---------------------|----------------------------|--------------|
| **search_ai_trends** | Get trending AI topics     | Web search or API (e.g. SerpAPI, Perplexity). Returns titles/snippets/URLs. |
| **generate_video_script** | Turn topics into video lines | LLM tool. Input: list of topics. Output: JSON `{ "lines": ["Hook", "Point 1", "Point 2", "CTA"] }` (4–6 short lines). |
| **render_video**     | Call your Railway renderer | HTTP tool: `POST` to `https://YOUR-RAILWAY-URL.up.railway.app/render`, body `{ "lines": ["..."] }`. Returns `status`, `webViewLink`, and `webContentLink` (video is saved to your Drive folder). |

### Workflow (high level)

1. **Trigger** – Schedule (e.g. daily) or run manually.
2. **Search** – Call `search_ai_trends` → get 1–3 trending AI topics.
3. **Script** – Call `generate_video_script` with those topics → get `lines` array.
4. **Render** – Call `render_video` with `lines` → video is rendered and uploaded to Google Drive; response includes `webViewLink` so you can open or share it.


You then check your Drive folder (or use the returned link), review the video, and upload to TikTok/IG manually.

### What you need for OpenClaw

- **LLM API key** (OpenAI / Anthropic / etc.) – for `generate_video_script`.
- **Search** – SerpAPI key, Perplexity API, or any search tool OpenClaw supports.
- **Railway URL** – from step 2 above, for `render_video`.
- **Google Drive** – configured on Railway (see step 2) so rendered videos are saved and you get `webViewLink` in the response.

---

## 4. Summary

- **Local:** Run `npx ts-node src/index.ts`, POST to `http://localhost:8080/render` with `{ "lines": ["..."] }`, videos in `out/`.
- **Railway:** Deploy from GitHub, set start command and optional Drive env vars, use the public URL as the render endpoint.
- **OpenClaw:** Add tools for search, script generation, and render (HTTP to Railway); chain them in a workflow so the AI produces the video and saves it to Google Drive. You get the link from the render response or your Drive folder.
