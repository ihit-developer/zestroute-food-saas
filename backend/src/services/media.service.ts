import { v2 as cloudinary } from 'cloudinary';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

export const ALLOWED_MEDIA_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export class MediaService {
  static async uploadBuffer(file: Express.Multer.File, folder: string = 'zestroute'): Promise<{ url: string; provider: string }> {
    if (!ALLOWED_MEDIA_MIMES.has(file.mimetype)) {
      throw new AppError(400, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPG, PNG, WEBP, or PDF files are allowed');
    }

    if (env.STORAGE_PROVIDER === 's3') {
      if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
        throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'S3 media storage credentials are not configured');
      }
      const client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT || undefined,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      });
      const key = `${folder}/${crypto.randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
      return { url: `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`, provider: 's3' };
    }

    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Cloudinary credentials are not configured in backend/.env');
    }

    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (err, res) => {
        if (err || !res) return reject(err ?? new Error('Upload failed'));
        resolve(res);
      });
      stream.end(file.buffer);
    });

    return { url: result.secure_url, provider: 'cloudinary' };
  }
}
