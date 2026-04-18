import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('test-cloudinary')
  @HttpCode(HttpStatus.OK)
  async testCloudinary() {
    return this.uploadService.testConnection();
  }
}
