import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { FacilityImagesService } from './facility-images.service';

@ApiTags('facility-images')
@Controller('facility-images')
export class FacilityImagesController {
  constructor(private readonly service: FacilityImagesService) {}

  /** Upload foto fasilitas (OWNER/ADMIN only). */
  @Post('upload/:slug')
  @ApiOperation({ summary: 'Upload foto fasilitas — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async upload(
    @Param('slug') slug: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any,
  ) {
    const result = await this.service.upload(slug, file);
    return { message: 'Foto fasilitas berhasil diunggah', data: result };
  }

  /** Daftar semua foto fasilitas yang sudah diupload (publik). */
  @Get()
  @ApiOperation({ summary: 'Daftar foto fasilitas — publik' })
  @Public()
  async list() {
    return { message: 'Daftar foto fasilitas berhasil diambil', data: this.service.list() };
  }

  /** Hapus foto fasilitas (OWNER/ADMIN only). */
  @Delete(':slug')
  @ApiOperation({ summary: 'Hapus foto fasilitas — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async delete(@Param('slug') slug: string) {
    this.service.delete(slug);
    return { message: 'Foto fasilitas berhasil dihapus' };
  }
}
