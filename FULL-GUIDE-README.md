# Full Guide: Research → Concept → Video → Edit → Save

This guide walks through the **full workflow**: use **OpenClaw** to research competitors and news (with Perplexity as web search), get a **concept**, create the video in **Seed Dance 2** manually, then return to **OpenClaw** to do final editing (captions, sound) via **Remotion** and **Railway**, and save the result.

---

## The flow (overview)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: OpenClaw — Research & concept                                       │
│  • Web search (Perplexity API): competitors, news, trends                    │
│  • Agent turns research into a structured CONCEPT                             │
│  • Output: concept (name, problem, insight, idea, differentiation)            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: Seed Dance 2 — Manually create the video                           │
│  • You take the concept and create the video in Seed Dance 2.0                │
│  • AI video generation based on the concept                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: OpenClaw — Final editing & posting                                 │
│  • Turn concept/script into final LINES (hook, points, CTA)                   │
│  • Remotion + Railway: render video with captions, sound                      │
│  • Save to Google Drive / Cloudinary (link in response)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements checklist

Before starting, make sure you have everything below. You said you already have OpenClaw, Remotion, Railway, and FFmpeg; use this list to confirm and fill gaps.

| Requirement | Purpose | How to check / get it |
|-------------|---------|------------------------|
| **Node.js** (v18+) | Run Remotion server and OpenClaw | `node -v` |
| **FFmpeg** on PATH | Remotion needs it to render video | `ffmpeg -version`; [download](https://www.gyan.dev/ffmpeg/builds/) and add `bin` to PATH |
| **OpenClaw** | Research, concept, and final render trigger | `openclaw status` or `openclaw dashboard` |
| **OpenClaw Gateway** | Serves the dashboard (port 18789) | `netstat -ano \| findstr :18789`; if empty, run `openclaw gateway start` |
| **Perplexity API key** | Web search for competitors, news (used by OpenClaw) | [perplexity.ai/account/api](https://www.perplexity.ai/account/api) — paid credits |
| **LLM for OpenClaw** | Script/concept generation | OpenAI, Gemini, or Ollama — see [OPENCLAW-SWITCH-PROVIDER.md](OPENCLAW-SWITCH-PROVIDER.md) |
| **Seed Dance 2.0** | Manually create video from concept | Install and use locally (your step) |
| **Railway** | Hosts Remotion renderer (final video with captions/sound) | Deploy this repo; get public URL |
| **Google Drive or Cloudinary** | Where final videos are saved | Configure on Railway (env vars) |

**Optional but useful**

- **competitor-research-concept skill** — Teaches OpenClaw “research → then propose concepts.” Included in this repo; copy to `%USERPROFILE%\.openclaw\skills\` (see Phase 1 below).

---

## Phase 1: OpenClaw — Research competitors & get a concept

Goal: use OpenClaw to search the web (Perplexity) for competitors and news, then have the agent produce a **concept** you can use in Seed Dance 2.

### 1.1 Start the dashboard

```powershell
openclaw gateway start
openclaw dashboard
```

If the dashboard doesn’t open or says “connection refused,” the gateway may not be running. See [Troubleshooting](#troubleshooting) at the end.

### 1.2 Configure Perplexity as web search

1. Get an API key: [perplexity.ai](https://www.perplexity.ai/) → sign in → **Settings** → **API** (or [perplexity.ai/account/api](https://www.perplexity.ai/account/api)). Add payment/credits, then **Generate** and copy the key (starts with `pplx-`).

2. Edit OpenClaw config:
   - **Windows:** open `%USERPROFILE%\.openclaw\openclaw.json`
   - Add or update `tools.web.search` so OpenClaw uses Perplexity:

   ```json
   "tools": {
     "web": {
       "search": {
         "provider": "perplexity",
         "perplexity": {
           "apiKey": "pplx-YOUR_KEY_HERE",
           "baseUrl": "https://api.perplexity.ai",
           "model": "perplexity/sonar-pro"
         }
       }
     }
   }
   ```

   Or set env var **`PERPLEXITY_API_KEY`** (e.g. in `%USERPROFILE%\.openclaw\.env`) and in config use only `"provider": "perplexity"`. Restart the gateway after changes.

3. Ensure **web_search** is allowed (no `tools.deny` that blocks it). If you use a restricted profile, add `"allow": ["exec", "web_search"]` as needed.

### 1.3 (Optional) Install the competitor-research-concept skill

This skill tells OpenClaw to research competitors and then propose 1–3 concepts (name, problem, insight, idea, differentiation).

```powershell
$dest = "$env:USERPROFILE\.openclaw\skills\competitor-research-concept"
New-Item -ItemType Directory -Path $dest -Force
Copy-Item -Path "D:\Cursor Project\ai-video-automation\skills\competitor-research-concept\*" -Destination $dest -Recurse -Force
```

Restart the gateway so the skill is loaded. In the dashboard, under **Tools**, enable **web_search** (and **exec** for Phase 3).

### 1.4 Run research and get a concept

In the OpenClaw dashboard, start a chat and use a prompt like:

```
Research competitors and recent news for [your niche/product/topic]. Use web_search. Then propose 1–3 concepts: for each give Name/title, Problem (who it's for), Insight (why this angle), Idea (one clear sentence), and Differentiation vs competitors. I'll use one of these to create a video in Seed Dance 2.
```

The agent will use **web_search** (Perplexity) and the **LLM**, then output structured concepts. Copy or note the concept you want to use in Phase 2.

---

## Phase 2: Seed Dance 2 — Manually create the video

- Take the **concept** from Phase 1 (name, problem, insight, idea, differentiation).
- Open **Seed Dance 2.0** and create the video based on that concept (your normal workflow in Seed Dance).
- This step is fully manual; no OpenClaw or Railway here. When you’re done, you have a draft video. The next phase is for the **final** version with captions and sound via Remotion.

---

## Phase 3: OpenClaw — Final editing (captions, sound) and save

Goal: turn the concept (or a refined script) into **final video lines**, then have Remotion on Railway render the polished video (with captions and sound as defined in this project) and save it.

In this repo, **Remotion** renders from **text lines** (hook, points, CTA), not from an existing video file. So “final editing” here means: OpenClaw produces the final **lines** → you call the Railway render API → Remotion generates the video with captions/sound → Railway saves it (Drive/Cloudinary) and returns the link.

### 3.1 Prerequisites for Phase 3

- **Railway** deploy of this repo (Remotion server) and its public URL. See main [README.md](README.md) §2 (Deploy to Railway).
- **Google Drive or Cloudinary** configured on Railway so the rendered video is saved and you get a link (`videoUrl` or `webViewLink`).
- **Exec allowed** in OpenClaw so the agent can run `curl` to call Railway. In `openclaw.json`, do not deny `exec` (or `group:runtime`); if you use a restricted profile, add `"allow": ["exec", "web_search"]`.

### 3.2 Get your Railway URL

From [railway.app](https://railway.app) → your project → the **ai-video-automation** service → **Settings** or **Deployments**, copy the public URL (e.g. `https://ai-video-automation-production-xxxx.up.railway.app`).

### 3.3 Option A: Edit your Seed Dance 2 video (add captions → Cloudinary)

Use this when you already have a video from Seed Dance 2 and want Remotion to add caption overlays and upload the result.

1. Get a **public URL** for your Seed Dance video (e.g. upload to Cloudinary or use any HTTPS link Railway can reach).
2. In the dashboard, use a prompt like this (replace `YOUR_RAILWAY_URL` and `YOUR_SEED_DANCE_VIDEO_URL`):

```
I have a video from Seed Dance 2 at this URL: YOUR_SEED_DANCE_VIDEO_URL

Write 4–6 short caption lines for it: hook, 2–3 main points, call to action. Output only JSON: {"videoUrl":"YOUR_SEED_DANCE_VIDEO_URL","lines":["Hook","Point 1","Point 2","CTA"]}.

Then call my video editor: curl -X POST YOUR_RAILWAY_URL/render-edit -H "Content-Type: application/json" -d "{\"videoUrl\":\"YOUR_SEED_DANCE_VIDEO_URL\",\"lines\":[\"Hook\",\"Point 1\",\"Point 2\",\"CTA\"]}"

Show me the full response (videoUrl or webViewLink).
```

The server probes the video duration with ffprobe (or uses a default). You can optionally pass `durationSeconds` in the JSON body.

### 3.5 Option B: Render new video from lines only

Use this when you want a brand-new video from text. In the dashboard, paste a prompt like this (replace `YOUR_RAILWAY_URL`):

```
Using the concept we already have [or: "Use this concept: <paste your concept summary>"], write 4–6 short lines for the final vertical video: hook, 2–3 main points, call to action. Output only a JSON object: {"lines": ["Hook", "Point 1", "Point 2", "CTA"]}. No other text.

Then call my video renderer: run curl (use exec). POST to YOUR_RAILWAY_URL/render with Content-Type application/json and body that JSON. Example: curl -X POST YOUR_RAILWAY_URL/render -H "Content-Type: application/json" -d "{\"lines\":[\"Hook\",\"Point 1\",\"Point 2\",\"CTA\"]}"

After calling the renderer, show me the full response (videoUrl or webViewLink).
```

The agent will produce the JSON, call `POST /render`, and Remotion will render the video and upload to Drive/Cloudinary. That’s your final video, saved.

---

## Quick reference

| Phase | Where | What |
|-------|--------|------|
| 1 | OpenClaw dashboard | Perplexity web search → research → concept (use competitor-research-concept skill if installed) |
| 2 | Seed Dance 2.0 | You manually create the video from the concept |
| 3A | OpenClaw dashboard | Seed Dance video URL + lines → curl POST `/render-edit` → Remotion adds captions → save to Cloudinary/Drive |
| 3B | OpenClaw dashboard | Lines only → curl POST `/render` → Remotion renders new video → save to Cloudinary/Drive |

---

## Phase 3 flow summary (edit Seed Dance video → Cloudinary)

Use this as a reference when wiring the pipeline or extending it later.

| Step | What happens |
|------|----------------|
| 1 | You have a video from **Seed Dance 2** (or any source). |
| 2 | You upload it to get a **public URL** (e.g. Cloudinary unsigned upload, or paste a link if already hosted). |
| 3 | In **OpenClaw**, you (or the agent) write **caption lines** and call `POST /render-edit` with `videoUrl` + `lines`. |
| 4 | **Remotion** (on Railway) fetches the video, overlays captions (one line per ~3s), renders to MP4. |
| 5 | Server uploads the result to **Cloudinary** (or Drive) and returns `videoUrl` (or `webViewLink`) in the response. |
| 6 | You use that link to download, share, or post the final video. |

**APIs:**

- **`POST /render`** — Render a **new** video from text only. Body: `{ "lines": ["...", "..."] }`. Returns `videoUrl` or `webViewLink` when Cloudinary/Drive is configured.
- **`POST /render-edit`** — **Edit** an existing video: add caption overlays. Body: `{ "videoUrl": "https://...", "lines": ["...", "..."], "durationSeconds": 30 }` (duration optional; server can probe via ffprobe). Returns same link format.

---

## Troubleshooting

### Dashboard won’t open (connection refused to 127.0.0.1:18789)

- The **gateway** must be running. Run: `openclaw gateway start` (leave the window open if you started it manually), or start the scheduled task: `Start-ScheduledTask -TaskName "OpenClaw Gateway"`.
- If the gateway starts then immediately exits, the config may be missing `gateway.mode`. A workaround is to add `--allow-unconfigured` to the gateway command in `%USERPROFILE%\.openclaw\gateway.cmd` (see main README or your earlier fix).

### Port 18789 not listening

```powershell
netstat -ano | findstr :18789
```

If nothing appears, start the gateway (see above). After a PC restart, the scheduled task should start the gateway at logon.

### Web search not working

- Confirm `tools.web.search` is set to Perplexity and the API key is valid (in `openclaw.json` or `PERPLEXITY_API_KEY` in `.openclaw\.env`).
- Restart the gateway after config changes.
- In the dashboard, ensure **web_search** is enabled under Tools.

### Agent can’t call Railway (exec denied)

- In `openclaw.json`, ensure `exec` is not in `tools.deny` and is allowed (e.g. `"allow": ["exec", "web_search"]`). Restart the gateway.

### Railway render fails or no video link

- Check Railway logs and env vars: **FFmpeg** must be available on Railway (e.g. `RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg` or use `nixpacks.toml` in the repo).
- For saving: set **Google Drive** or **Cloudinary** variables on Railway so the response includes `videoUrl` or `webViewLink`.

---

## See also

- Main [README.md](README.md) — local Remotion server, Railway deploy, env vars.
- [OPENCLAW-SWITCH-PROVIDER.md](OPENCLAW-SWITCH-PROVIDER.md) — switch LLM (Gemini, Ollama, OpenAI).
- [OPENCLAW-RESEARCH-CONCEPT-FREE.md](OPENCLAW-RESEARCH-CONCEPT-FREE.md) — free options for research + concept (Brave, Ollama).
- Skill: `skills/competitor-research-concept/SKILL.md` — what the competitor-research-concept skill does.
