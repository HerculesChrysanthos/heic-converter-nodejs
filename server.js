const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const heicConvert = require('heic-convert');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB local; Vercel free caps at ~4.5MB
});

const ALLOWED_FORMATS = new Set(['PNG', 'JPEG', 'WEBP']);

app.get('/health', (_req, res) => res.json({ ok: true }));

async function padTo43(buf) {
  const { width, height } = await sharp(buf).metadata();
  const ratio = width / height;
  const target = 4 / 3;
  if (Math.abs(ratio - target) < 0.01) return buf;

  const canvasW = ratio > target ? width : Math.round(height * 4 / 3);
  const canvasH = ratio > target ? Math.round(width * 3 / 4) : height;

  const bg = await sharp(buf)
    .resize(canvasW, canvasH, { fit: 'cover' })
    .blur(20)
    .png()
    .toBuffer();

  return sharp(bg)
    .composite([{
      input: buf,
      left: Math.round((canvasW - width) / 2),
      top: Math.round((canvasH - height) / 2)
    }])
    .png()
    .toBuffer();
}

app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!req.file.originalname.toLowerCase().endsWith('.heic')) {
      return res.status(400).json({ error: 'Not a HEIC file' });
    }

    const fmt = (req.body.format || 'PNG').toUpperCase();
    if (!ALLOWED_FORMATS.has(fmt)) {
      return res.status(400).json({ error: `Unsupported format: ${fmt}` });
    }

    const quality = Math.max(1, Math.min(100, parseInt(req.body.quality) || 85));
    const maxSize = parseInt(req.body.max_size) > 0 ? parseInt(req.body.max_size) : null;
    const pad = req.body.pad === 'true';

    // Decode HEIC via heic-convert (handles HEVC on all platforms)
    const pngBuf = await heicConvert({ buffer: req.file.buffer, format: 'PNG' });
    let image = sharp(Buffer.from(pngBuf));

    if (maxSize) {
      image = image.resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true });
    }

    let buf = await image.toBuffer();

    if (pad) {
      buf = await padTo43(buf);
    }

    let finalBuf, mimeType, ext;
    if (fmt === 'JPEG') {
      finalBuf = await sharp(buf).flatten({ background: '#ffffff' }).jpeg({ quality }).toBuffer();
      mimeType = 'image/jpeg';
      ext = 'jpg';
    } else if (fmt === 'PNG') {
      finalBuf = await sharp(buf).png({ compressionLevel: 9 }).toBuffer();
      mimeType = 'image/png';
      ext = 'png';
    } else {
      finalBuf = await sharp(buf).webp({ quality }).toBuffer();
      mimeType = 'image/webp';
      ext = 'webp';
    }

    const baseName = path.parse(req.file.originalname).name;
    res.set('Content-Type', mimeType);
    res.set('Content-Disposition', `attachment; filename="${baseName}.${ext}"`);
    res.send(finalBuf);

  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ error: err.message || 'Conversion failed' });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
}
