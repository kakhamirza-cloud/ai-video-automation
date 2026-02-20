# AI Video Automation

Node + Remotion server that renders short vertical videos from text lines. Use it locally or deploy to Railway and call it from OpenClaw for full automation: **research trending AI → generate script → render video → save to Google Drive**.

**Want ad-style content (copy, look, audio)?** See **[README-ADS.md](README-ADS.md)** for what you need and how to extend the project.

**Want free, no rate limits?** Use **Ollama** (local LLM) with OpenClaw: see **[README-OLLAMA.md](README-OLLAMA.md)** for the full guide.

**Switch agent (Gemini / Ollama / OpenAI)?** See **[OPENCLAW-SWITCH-PROVIDER.md](OPENCLAW-SWITCH-PROVIDER.md)**.

**Full workflow (research → concept → Seed Dance 2 → final edit + save)?** See **[FULL-GUIDE-README.md](FULL-GUIDE-README.md)**.

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
   - **Or use Cloudinary** (no quota issues): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` from [cloudinary.com/console](https://cloudinary.com/console). Optional: `CLOUDINARY_FOLDER` (e.g. `ai-video`).
   - **`RAILPACK_DEPLOY_APT_PACKAGES`** – set to **`ffmpeg`** (apt, not mise) (required for Remotion to render video on Railway). If you use Nixpacks instead, the repo’s `nixpacks.toml` already adds FFmpeg.
   - `PORT` – Railway sets this automatically; don’t override unless needed.
5. Deploy. Railway will give you a URL like **https://ai-video-automation-production-xxxx.up.railway.app**.

### Test the deployed API

```powershell
$body = @{ lines = @("Hook","Point 1","Point 2","CTA") } | ConvertTo-Json
Invoke-WebRequest -Uri "https://YOUR-RAILWAY-URL.up.railway.app/render" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
```   

If Cloudinary is configured, the response includes `videoUrl` (shareable link). If Drive is configured, you get `webViewLink` / `webContentLink`. With neither, the video is rendered only on the server (ephemeral).

---

## 3. OpenClaw: full automation

Install OpenClaw **globally** so you can use it from any project:

```powershell
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Then run `openclaw doctor`, `openclaw status`, or `openclaw dashboard` from any directory. See [docs.openclaw.ai/install](https://docs.openclaw.ai/install).

Use OpenClaw to run the full pipeline: **research → script → render → save to Google Drive**.

### Pipeline logic (how OpenClaw maps to it)

OpenClaw uses **built-in** tools; you don’t create separate “custom” tools. The mapping is:

| Step     | Purpose                    | OpenClaw built-in |
|----------|----------------------------|-------------------|
| Search   | Get trending AI topics     | **web_search** (needs Brave or Perplexity API key; run `openclaw configure --section web`) |
| Script   | Turn topics into video lines | **LLM** (you ask in chat; agent returns JSON `{ "lines": ["Hook", "Point 1", "Point 2", "CTA"] }`) |
| Render   | Call your Railway renderer | **exec** with `curl -X POST https://YOUR-RAILWAY-URL/render -d '{"lines":[...]}'` |

For step-by-step setup and a copy-paste prompt, see **§3b. OpenClaw full guide** below.

### Workflow (high level)

1. **Trigger** – Open dashboard and chat, or schedule (e.g. cron).
2. **Search** – Agent uses **web_search** → 1–3 trending AI topics.
3. **Script** – Agent uses the **LLM** → JSON `{ "lines": [...] }`.
4. **Render** – Agent uses **exec** (curl) → POST to Railway → video rendered and uploaded; response has `videoUrl` or `webViewLink`.

You then open the link or your Drive/Cloudinary folder, review the video, and upload to TikTok/IG if you like. Details and a ready-to-paste prompt are in **§3b. OpenClaw full guide**.

### What you need for OpenClaw

- **LLM API key** (OpenAI / Anthropic / etc.) – for script generation. **Free tier option:** use Google Gemini (see below).
- **Search** – Brave API key or Perplexity (see full guide below), or skip and paste topics (free).
- **Railway URL** – from step 2 above, for the render step.
- **Google Drive or Cloudinary** – configured on Railway so you get a video link in the response.

### Using a free-tier LLM (e.g. Google Gemini)

To avoid OpenAI rate limits or cost, you can switch OpenClaw to **Google Gemini**, which has a free tier (no credit card for AI Studio):

1. **Get a Gemini API key:** Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with Google, create an API key. Copy it (starts with `AIza...`).
2. **Point OpenClaw at Gemini:** Edit the config file (see **How to edit openclaw.json** below), then restart the Gateway.
3. **Restart the Gateway** so the new model is used (e.g. close the dashboard and run `openclaw dashboard` again, or restart the OpenClaw service).

**Alternative:** Run `openclaw onboard` and choose **Google** as the provider, then paste the key when prompted (no manual file edit).

#### How to edit openclaw.json (Windows)

1. **Open the config folder**
   - Press **Win + R**, type `%USERPROFILE%\.openclaw` and press Enter.  
   - Or in File Explorer go to: `C:\Users\YourUsername\.openclaw` (replace YourUsername with your Windows user name).

2. **Open the file**
   - If you see **openclaw.json**, double-click it (opens in Notepad or your default editor).  
   - If it doesn’t exist yet, create a new text file there, name it `openclaw.json`, and open it.

3. **Add or merge the Gemini settings**
   - **If the file is empty or you’re okay replacing it**, paste this (use your real key instead of `YOUR_GEMINI_KEY_HERE`):
     ```json
     {
       "env": { "GOOGLE_API_KEY": "YOUR_GEMINI_KEY_HERE" },
       "agents": { "defaults": { "model": { "primary": "google/gemini-2.0-flash" } } }
     }
     ```
   - **If the file already has other settings**, you must **merge** and not remove them. Add or update only these parts:
     - Under the top-level object, add or edit `"env"`: ensure it has `"GOOGLE_API_KEY": "your-real-key"`.
     - Add or edit `"agents"`: ensure `"agents": { "defaults": { "model": { "primary": "google/gemini-2.0-flash" } } }` is present (other keys like `list` can stay).
   - Example of a merged config (your file may have more keys; keep them and only add/change these):
     ```json
     {
       "env": {
         "GOOGLE_API_KEY": "AIzaSy..."
       },
       "agents": {
         "defaults": {
           "model": { "primary": "google/gemini-2.0-flash" }
         }
       }
     }
     ```

4. **Save the file**
   - Save (Ctrl+S). Make sure the file is named exactly `openclaw.json` and is in the `.openclaw` folder (no `.txt` at the end).

5. **Restart OpenClaw**
   - Close the dashboard if it’s open. Run `openclaw dashboard` again (or restart the OpenClaw Gateway). New chats will use Gemini.

Free tier limits (Google AI Studio): e.g. 15 requests/minute for Gemini Flash; check Google’s current limits. **OpenRouter** also offers free models (one API key, multiple providers); see [docs.openclaw.ai](https://docs.openclaw.ai) for OpenRouter config if you prefer that.

---

## 3b. OpenClaw full guide (step-by-step)

OpenClaw doesn’t use separate “custom tools” for this pipeline. It uses **built-in tools**: `web_search` (search), the **LLM** (script), and **exec** (curl to Railway). Follow these steps to wire everything up.

### Step 1: Access the dashboard

- **Any time:** From any directory run:
  ```powershell
  openclaw dashboard
  ```
  Your browser will open the Control UI (e.g. http://127.0.0.1:18789/).

- **After restarting your computer:** The Gateway may not be running. Check and start it:
  ```powershell
  openclaw status
  ```
  If **Gateway** shows “unreachable” or “Scheduled Task not installed”, run once:
  ```powershell
  openclaw onboard --install-daemon
  ```
  Then use `openclaw dashboard` again. The daemon makes the Gateway start automatically on boot so the dashboard is available whenever you need it.

### Step 2: Enable web search (for trending topics)

You need a way for the agent to get “trending AI” topics. Options:

**Option A – Free: no search API (skip web_search)**

Don’t configure Brave or Perplexity. In the dashboard prompt, **skip step 1** and give the topics yourself. Example:

```
Use these 3 topics: AI agents in 2025, GPT-5 rumors, open-source LLMs. Turn them into 4–6 short video lines (hook, points, CTA) and output only JSON: {"lines": ["...", "..."]}. Then call my renderer with curl: POST to https://YOUR_RAILWAY_URL/render with that JSON. Show me the response.
```

No API key, no cost. You can change the topics each time you run.

**Option B – Brave Search ($5 free credit/month, then paid):**

1. Create an account at [brave.com/search/api](https://brave.com/search/api/).
2. Choose **“Data for Search”** (not “Data for AI”) and create an API key.
3. In a terminal run:
   ```powershell
   openclaw configure --section web
   ```
   Paste your Brave API key when prompted. It’s stored in `~/.openclaw/openclaw.json`.

**Option C – Perplexity (AI-synthesized search answers, paid):**

1. **Get an API key:** Go to [perplexity.ai](https://www.perplexity.ai/) → sign in → **Settings** → **API** (or [perplexity.ai/account/api](https://www.perplexity.ai/account/api)). Add a payment method and credits, then click **Generate** and copy the key (starts with `pplx-`). Perplexity API is paid (credits); no permanent free tier.
2. **Tell OpenClaw to use Perplexity:** Edit `~/.openclaw/openclaw.json` (Windows: `%USERPROFILE%\.openclaw\openclaw.json`). Under `tools.web.search` set:
   ```json
   "provider": "perplexity",
   "perplexity": {
     "apiKey": "pplx-YOUR_KEY_HERE",
     "baseUrl": "https://api.perplexity.ai",
     "model": "perplexity/sonar-pro"
   }
   ```
   Or set the env var **`PERPLEXITY_API_KEY`** in the Gateway environment (e.g. in `~/.openclaw/.env`) and set only `"provider": "perplexity"` in config. Restart the Gateway after changing config (`openclaw status` / daemon restart).
3. **Alternative – OpenRouter:** You can use OpenRouter (supports prepaid/crypto) with a Perplexity model; set `OPENROUTER_API_KEY` and in config use `baseUrl: "https://openrouter.ai/api/v1"` and a Perplexity model id. See [docs.openclaw.ai/perplexity](https://docs.openclaw.ai/perplexity).

**Option D – SearXNG (free, self-hosted):** OpenClaw may support or add support for [SearXNG](https://docs.searxng.org/) (a free metasearch engine you run yourself, no API key). Check [OpenClaw docs](https://docs.openclaw.ai/tools/web) or the [searxng-local skill](https://playbooks.com/skills/moltbot/skills/searxng-local); if available, set `provider: "searxng"` and your SearXNG instance URL. Requires running SearXNG (e.g. via Docker).

### Step 3: Allow the exec tool (for calling Railway)

The agent calls your Railway renderer using **exec** (it runs `curl`). Exec must be allowed.

**Do you need to do anything?**

- **If you never changed tool settings** – exec is usually allowed by default. You can **skip this step** and go to Step 4. If the agent later fails to run curl, come back here.
- **If you restricted tools** (e.g. during onboarding you picked “messaging” only, or you edited config) – you need to allow exec.

**How to allow exec:**

1. Open your OpenClaw config in an editor:
   - **Windows:** `%USERPROFILE%\.openclaw\openclaw.json`
   - **Mac/Linux:** `~/.openclaw/openclaw.json`  
   (Run `openclaw doctor` to see the exact path.)
2. Look for a `tools` section. You might see `profile`, `allow`, or `deny`.
3. **If there’s `tools.deny`** and it lists `exec` or `group:runtime` – remove `exec` / `group:runtime` from that list (or remove the whole `deny` list if it only had that).
4. **If there’s `tools.profile: "messaging"`** (or similar) and no `allow` – add an allow so exec is included. For example:
   ```json
   "tools": {
     "profile": "messaging",
     "allow": ["exec", "web_search"]
   }
   ```
   Or use a profile that already allows exec, e.g. `"profile": "coding"` (allows `group:runtime`, which includes exec).
5. Save the file and restart the Gateway (e.g. close the dashboard and run `openclaw dashboard` again, or restart the OpenClaw service).

After that, the agent can run `curl` to POST to your Railway URL. See [docs.openclaw.ai/tools](https://docs.openclaw.ai/tools) for full tool profiles and groups.

### Step 4: Run the pipeline from the dashboard

1. Open the dashboard: `openclaw dashboard`.
2. Start a **chat** with the default agent (main session).
3. Send one of the prompts below (with your Railway URL and, for the no-search version, your topics).

**If you use the free option (no search API)** – paste this and replace the two placeholders:

- `YOUR_RAILWAY_URL` → your Railway app URL (e.g. `https://ai-video-automation-production-xxxx.up.railway.app`). Get it from [railway.app](https://railway.app) → your project → the service → **Settings** or **Deployments** (public URL).
- `Topic 1, Topic 2, Topic 3` → any 2–3 topics you want the video to be about (e.g. `AI agents, GPT-5, open-source LLMs`).

   ```
   Use these topics: Topic 1, Topic 2, Topic 3.

   Turn them into 4–6 short lines for a vertical video: hook, 2–3 main points, call to action. Output only a JSON object with one key "lines" and an array of strings, e.g. {"lines": ["Hook", "Point 1", "Point 2", "CTA"]}. No other text.

   Then call my video renderer: run curl (use exec). POST to https://ai-video-automation-production.up.railway.app/render with Content-Type application/json and body that JSON. Example: curl -X POST https://ai-video-automation-production.up.railway.app/render -H "Content-Type: application/json" -d "{\"lines\":[\"Hook\",\"Point 1\",\"Point 2\",\"CTA\"]}"

   After calling the renderer, show me the full response (it may include videoUrl or webViewLink).
   ```

**If you use web search (Brave/Perplexity)** – use this prompt instead (same Railway URL replacement):

   ```
   Do this in order:

   1. Search the web for 1–3 trending AI topics right now (use web_search). Summarize them in one short list.
   2. Using those topics, write 4–6 short lines for a vertical video: hook, 2–3 main points, call to action. Output only a JSON object with one key "lines" and an array of strings, e.g. {"lines": ["Hook", "Point 1", "Point 2", "CTA"]}. No other text.
   3. Call my video renderer: run a single command with curl (use exec). POST to https://YOUR_RAILWAY_URL/render with Content-Type application/json and body the JSON from step 2. Example: curl -X POST https://YOUR_RAILWAY_URL/render -H "Content-Type: application/json" -d "{\"lines\":[\"Hook\",\"Point 1\",\"Point 2\",\"CTA\"]}"

   After step 3, show me the response from the renderer (it may include a video link).
   ```

4. The agent will use the **LLM** to produce the JSON, then **exec** with `curl` to POST to Railway. The render response will include `videoUrl` (Cloudinary) or `webViewLink`/`webContentLink` (Drive) if you configured those on Railway.

### Step 5: Reuse the workflow

- **Manual run:** Open the dashboard, start a new chat, and paste the same prompt (with your Railway URL). You can save the prompt in a text file for quick copy-paste.
- **Scheduling:** Use OpenClaw’s **cron** tool or a scheduled task that opens the dashboard / sends a message to the agent, if you want daily runs. See [docs.openclaw.ai/tools](https://docs.openclaw.ai/tools) (cron, gateway).

### Checklist

| Step | What to do |
|------|-------------|
| Dashboard | `openclaw dashboard` (after restart: `openclaw status` → if needed `openclaw onboard --install-daemon`) |
| Search | `openclaw configure --section web` + Brave API key (or Perplexity in config) |
| Exec | No deny on `exec` / `group:runtime` in your tool profile |
| Railway URL | Replace `YOUR_RAILWAY_URL` in the prompt with your real URL |
| Run | Paste the full prompt in a chat; agent uses web_search → LLM → exec (curl) |

### Config file location

- Main config: **`~/.openclaw/openclaw.json`** (Windows: `%USERPROFILE%\.openclaw\openclaw.json`).
- Run `openclaw doctor` to see the exact path and check for issues.

---

## 4. Summary

- **Local:** Run `npx ts-node src/index.ts`, POST to `http://localhost:8080/render` with `{ "lines": ["..."] }`, videos in `out/`.
- **Railway:** Deploy from GitHub, set start command and optional Drive env vars, use the public URL as the render endpoint.
- **OpenClaw:** Add tools for search, script generation, and render (HTTP to Railway); chain them in a workflow so the AI produces the video and saves it to Google Drive. You get the link from the render response or your Drive folder.
