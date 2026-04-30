// upload.js -- Express + Multer with magic byte validation
import express from 'express';                    // ^4.21.0
import multer from 'multer';                      // ^1.4.5
import { fileTypeFromBuffer } from 'file-type';   // ^19.0.0
import { randomUUID } from 'crypto';
import { readFile, unlink, rename } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = '/var/uploads';  // Outside web root
const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'application/pdf'
]);

const upload = multer({
  dest: '/tmp/uploads',
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf']);
    cb(null, allowed.has(ext));
  }
});

const app = express();

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  try {
    // Magic byte validation (Content-Type header is NOT trusted)
    const buffer = await readFile(req.file.path);
    const type = await fileTypeFromBuffer(buffer);
    if (!type || !ALLOWED_MIMES.has(type.mime)) {
      await unlink(req.file.path);
      return res.status(400).json({ error: 'Invalid file content' });
    }
    // Generate safe filename, move to secure storage
    const safeName = `${randomUUID()}${type.ext ? '.' + type.ext : ''}`;
    await rename(req.file.path, path.join(UPLOAD_DIR, safeName));
    res.status(201).json({ id: safeName });
  } catch (err) {
    if (req.file?.path) await unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: 'Upload failed' });
  }
});
