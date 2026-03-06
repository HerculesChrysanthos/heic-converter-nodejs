# HEIC Converter

A self-hosted web app for batch converting `.heic` photos to PNG, JPEG, or WebP. Runs locally via Node.js/Express with a browser-based UI.

---

## Features

- Batch convert multiple HEIC files in one session
- Output formats: **PNG**, **JPEG**, **WebP**
- Quality control slider (for JPEG/WebP)
- Max resolution cap (800px up to 4K, or original)
- Optional **pad to 4:3** — blurred background fill to letterbox non-4:3 images
- Per-file download or bulk **Download ZIP**
- Drag-and-drop or click-to-browse file picker
- Dark / light theme toggle
- Live server status indicator

---

## Stack

| Layer | Library |
|---|---|
| Server | Node.js + Express |
| HEIC decoding | [heic-convert](https://github.com/catdad-experiments/heic-convert) |
| Image processing | [Sharp](https://sharp.pixelplumbing.com/) |
| File upload | Multer (memory storage) |
| ZIP bundling | JSZip (client-side) |

---

## Requirements

- Node.js 18+
- npm

---

## Setup

```bash
# Clone or download the project
cd heic-converter-node

# Install dependencies
npm install

# Start the server
npm start
```

Open `http://localhost:3000` in your browser.

---

## Usage

1. Select output format (PNG / JPEG / WebP)
2. Adjust quality (JPEG/WebP only) and max resolution if needed
3. Toggle **Pad to 4:3** if you want blurred-background letterboxing
4. Drop `.heic` files onto the dropzone or click to browse
5. Click **Convert All**
6. Download files individually or as a ZIP

---

## API

The server exposes a single conversion endpoint consumed by the UI.

### `POST /api/convert`

Accepts `multipart/form-data`.

| Field | Type | Description |
|---|---|---|
| `file` | File | The `.heic` file to convert |
| `format` | string | `PNG`, `JPEG`, or `WEBP` (default: `PNG`) |
| `quality` | number | 1–100, used for JPEG/WebP (default: `85`) |
| `max_size` | number | Longest edge in px; `0` = no resize (default: `0`) |
| `pad` | string | `"true"` to enable 4:3 padding (default: `"false"`) |

**Success:** returns the converted image as a binary download with `Content-Disposition: attachment`.

**Error:** returns `{ "error": "..." }` with an appropriate HTTP status code.

### `GET /health`

Returns `{ "ok": true }` when the server is running. Used by the UI status indicator.

---

## Conversion Pipeline

```
HEIC buffer (upload)
  → heic-convert   (HEIC/HEVC decode → PNG buffer)
  → Sharp resize   (if max_size set)
  → Sharp pad      (if pad=true: blurred 4:3 canvas composite)
  → Sharp encode   (PNG / JPEG / WebP output)
  → HTTP response
```

`heic-convert` handles HEVC-compressed HEIC files on all platforms (including Windows, where the Sharp prebuilt binary does not bundle HEVC decoder plugins).

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port (`PORT` env var or edit `server.js`) |
| File size limit | `50 MB` | Set in `multer` options in `server.js` |

---

## Deployment Notes

### Vercel (free tier)

- Serverless function payload limit is ~4.5 MB — large HEIC files will fail
- Add a `vercel.json` to route all requests to `server.js`
- The 50 MB multer limit should be lowered to match the platform cap

### Self-hosted / local network

No changes needed. The server listens on `0.0.0.0` by default so it is accessible from other devices on the same network via your machine's local IP.

---

## Troubleshooting

**"No decoding plugin installed for this compression format"**
Sharp's prebuilt Windows binary does not include the HEVC codec. This project fixes that by routing HEIC decoding through `heic-convert` before passing data to Sharp.

**"source: bad seek"**
The uploaded file may be truncated or corrupted. Re-export the photo from the source device and try again.

**Server shows offline in the UI**
Make sure `node server.js` (or `npm start`) is running and nothing else is using port 3000.

**Quality slider is greyed out**
Quality only applies to lossy formats. Switch to JPEG or WebP to enable it.

---

## Project Structure

```
heic-converter-node/
├── server.js        # Express server, conversion logic
├── package.json
└── public/
    └── index.html   # Single-page UI (vanilla JS, no build step)
```

---

## License

MIT
