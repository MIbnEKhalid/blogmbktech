import path from 'path';
import crypto from 'crypto';

// File signature validation for images
const IMAGE_SIGNATURES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'image/svg+xml': [[0x3C, 0x3F, 0x78, 0x6D], [0x3C, 0x73, 0x76, 0x67]] // <?xml or <svg
};

/**
 * Validate file signature against declared MIME type.
 * @param {Buffer} buffer - File buffer to validate
 * @param {string} mimeType - Declared MIME type
 * @returns {boolean}
 */
export function validateFileSignature(buffer, mimeType) {
  const signatures = IMAGE_SIGNATURES[mimeType];
  if (!signatures) return false;

  return signatures.some(signature => {
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Generate a secure filename for uploaded files.
 * @param {string} originalname - Original file name from the upload
 * @returns {string} - Safe key path for R2 / S3
 */
export function generateSecureFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

  if (!allowedExtensions.includes(ext)) {
    throw new Error('Invalid file extension');
  }

  const randomName = crypto.randomUUID();
  return `blog-images/${randomName}${ext}`;
}
