import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/fileFilter';
import { fileNamer } from './helpers/fileNamer';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FilesService, private readonly configService: ConfigService) {}

  @Get('product/:imageName')
  findProductImage(
    @Res() res: Response,
    @Param('imageName') imageName: string
  ) {
    const path = this.fileService.getStaticProductImage(imageName)
    res.sendFile(path)
  }

  @Post('product')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilter,
    // limits: {fileSize: 1000 },
    storage: diskStorage({
      destination: './static/products',
      filename: fileNamer
    })
  }))
  uploadProductImage(
    @UploadedFile() file: Express.Multer.File
  ) {
    
    if (!file) {
      throw new BadRequestException('Make sure thatthe file is an image');
    }

    const secureUrl = `${this.configService.get('HOST_API')}/files/product/${file.filename}`

    return {
      secureUrl
    }
  }
}
