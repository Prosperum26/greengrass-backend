import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import sharp from 'sharp';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIMETYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary configuration is required. ' +
          'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Max size: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!this.ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${this.ALLOWED_MIMETYPES.join(', ')}`,
      );
    }
  }

  /**
   * Upload event cover image
   * Resizes to max 1200px width, converts to webp
   */
  async uploadEventCover(
    file: Express.Multer.File,
    eventId: string,
  ): Promise<UploadResult> {
    this.validateFile(file);

    try {
      // Process with sharp
      const processedBuffer = await sharp(file.buffer)
        .resize(1200, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      return await this.uploadToCloudinary(
        processedBuffer,
        `greengrass/events/${eventId}/cover`,
      );
    } catch (error) {
      this.logger.error('Failed to process/upload event cover', error);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * Upload gallery images
   * Resizes to max 800px width
   */
  async uploadEventGallery(
    file: Express.Multer.File,
    eventId: string,
  ): Promise<UploadResult> {
    this.validateFile(file);

    try {
      const processedBuffer = await sharp(file.buffer)
        .resize(800, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const timestamp = Date.now();
      return await this.uploadToCloudinary(
        processedBuffer,
        `greengrass/events/${eventId}/gallery/${timestamp}`,
      );
    } catch (error) {
      this.logger.error('Failed to process/upload gallery image', error);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * Upload user avatar
   * Crops to 300x300, center focus
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResult> {
    this.validateFile(file);

    try {
      const processedBuffer = await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 90 })
        .toBuffer();

      return await this.uploadToCloudinary(
        processedBuffer,
        `greengrass/avatars/${userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to process/upload avatar', error);
      throw new BadRequestException('Failed to process avatar');
    }
  }

  /**
   * Upload proof image for event registration
   */
  async uploadProofImage(
    file: Express.Multer.File,
    registrationId: string,
  ): Promise<UploadResult> {
    this.validateFile(file);

    try {
      const processedBuffer = await sharp(file.buffer)
        .resize(1000, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      return await this.uploadToCloudinary(
        processedBuffer,
        `greengrass/proofs/${registrationId}`,
      );
    } catch (error) {
      this.logger.error('Failed to process/upload proof image', error);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted image: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete image: ${publicId}`, error);
      throw new BadRequestException('Failed to delete image');
    }
  }

  /**
   * Core upload method using stream
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    publicId: string,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'image',
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error', error);
            return reject(new BadRequestException('Upload failed'));
          }
          if (!result) {
            return reject(new BadRequestException('Upload failed - no result'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      // Convert buffer to stream
      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Test Cloudinary connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    cloudName?: string;
    status?: string;
    error?: string;
  }> {
    try {
      // Test by getting cloudinary account info (ping)
      interface CloudinaryPingResponse {
        status: string;
      }
      const result = (await cloudinary.api.ping()) as CloudinaryPingResponse;

      return {
        success: true,
        message: 'Cloudinary connection successful',
        cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
        status: result.status,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Cloudinary connection test failed', errorMessage);

      return {
        success: false,
        message: 'Cloudinary connection failed',
        error: errorMessage,
      };
    }
  }
}
