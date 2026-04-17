import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// 1. Import thêm Swagger
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 2. Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Greengrass API')
    .setDescription('Tài liệu API cho dự án Greengrass Backend')
    .setVersion('1.0')
    .addBearerAuth() // Thêm nút ổ khóa để nhập Token (JWT)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Đường dẫn sẽ là /api

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Tự động convert kiểu dữ liệu (ví dụ: string sang number)
      whitelist: true, // Loại bỏ các field không được định nghĩa trong DTO
      forbidNonWhitelisted: true, // Trả lỗi 400 nếu có field lạ
    }),
  );

  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger Docs is running on: ${await app.getUrl()}/api`); // Thêm log cho ngầu
}
bootstrap();
