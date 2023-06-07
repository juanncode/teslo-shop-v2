import { Module } from '@nestjs/common';
import { FilesService } from './file.service';
import { FileController } from './file.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [FileController],
  providers: [FilesService],
  imports: [
    ConfigModule
  ]
})
export class FileModule {}
