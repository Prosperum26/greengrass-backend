import { BadRequestException } from '@nestjs/common';

/**
 * Multer options for image upload
 */
export const imageFileFilter = (
  req: Express.Request,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (!file) {
    return callback(null, true);
  }

  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimetypes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Invalid file type. Only ${allowedMimetypes.join(', ')} are allowed`,
      ),
      false,
    );
  }

  callback(null, true);
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
