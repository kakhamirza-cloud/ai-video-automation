---
name: video-edit-with-assets
description: Edit a video (add captions, optional music, logo, brand color) via the render-edit API. Use when the user provides a video URL and optionally music/logo/color URLs.
user-invocable: true
---

# Video edit with optional assets

Use this skill when the user wants to **edit an existing video** (e.g. from Seed Dance 2) by adding captions and, if they provide them, **music**, **logo**, or **brand color**. The agent calls the `POST /render-edit` API with whatever the user gives.

## Workflow

### 1. Understand the request

- **Required:** A **video URL** (the existing video to edit).
- **Required:** **Caption lines** (hook, points, CTA) — either the user provides them or you write 4–6 short ad-style lines.
- **Optional (only if user provides):**
  - **Music URL** — background music (e.g. MP3). Include in the JSON as `musicUrl` only if the user gives a URL or says "add this music [url]".
  - **Logo URL** — image URL for a logo overlay. Include as `logoUrl` only if the user gives it.
  - **Brand color** — hex color for caption text (e.g. `#FF5500`). Include as `primaryColor` only if the user specifies it.
  - **Voiceover URL** — optional audio URL. Include as `voiceoverUrl` only if the user provides it.

### 2. Build the request body

- Build a JSON object for `POST /render-edit`:
  - Always include: `videoUrl`, `lines` (array of strings).
  - Include `musicUrl`, `voiceoverUrl`, `logoUrl`, or `primaryColor` **only when the user has provided them**. Do not invent URLs or colors.
- If the user did not mention music, logo, or color, omit those keys. The API works with just `videoUrl` and `lines`.

### 3. Call the API

- Use **exec** to run curl: `POST YOUR_RAILWAY_URL/render-edit` with `Content-Type: application/json` and the body from step 2.
- Show the user the response (e.g. `videoUrl` or `webViewLink`).

## Tools to use

- **exec**: required to call the render-edit API with curl.
- **web_search**: not required for this skill unless the user asks you to research something first.

## Example user prompts

- "Edit this video https://example.com/video.mp4 and add these captions: [list]. Use our logo https://example.com/logo.png and brand color #FF5500."
- "Add captions and this music https://example.com/music.mp3 to my video https://..."
- "Edit https://... with captions only." (no music/logo/color — send only videoUrl and lines)

## Important

- Do not add `musicUrl`, `logoUrl`, `primaryColor`, or `voiceoverUrl` to the JSON unless the user has explicitly provided a URL or color. Omitting them is correct and the flow still works.
