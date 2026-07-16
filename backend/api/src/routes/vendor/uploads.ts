import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const upload = multer({ storage: multer.memoryStorage() });

export const vendorUploadsRouter = Router();

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * POST /api/vendor/uploads/presign
 * Deprecated: Using direct uploads instead of client-side SAS.
 */
vendorUploadsRouter.post('/presign', async (req, res) => {
  return res.status(400).json({ error: 'Deprecated. Use /direct instead.' });
});

/**
 * POST /api/vendor/uploads/direct
 * Uploads a file directly to Cloudinary.
 */
vendorUploadsRouter.post('/direct', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return res.status(500).json({ error: 'Cloudinary configuration error' });
    }

    // Upload to Cloudinary using a stream
    const uploadToCloudinary = () => {
      return new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `nazrana/vendors/${(req as any).vendorId}` },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        stream.end(file.buffer);
      });
    };

    const result = await uploadToCloudinary();
    
    return res.json({ publicUrl: result.secure_url });
  } catch (error) {
    console.error('POST /api/vendor/uploads/direct error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
