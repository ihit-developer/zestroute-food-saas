import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import { MediaService } from '../services/media.service.js';
import { AppError } from '../middleware/error.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const mediaRouter = Router();

mediaRouter.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'FILE_REQUIRED', 'No file uploaded');
      }
      const folder = typeof req.body?.folder === 'string' ? req.body.folder : 'zestroute';
      const result = await MediaService.uploadBuffer(req.file, folder);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);
