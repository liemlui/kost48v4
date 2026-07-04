import {
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { MarketingAssetsService } from './marketing-assets.service';

@ApiTags('marketing-assets')
@Controller('marketing-assets')
export class MarketingAssetsController {
  constructor(private readonly service: MarketingAssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar aset marketing — publik' })
  @Public()
  async list() {
    return { message: 'Daftar aset marketing berhasil diambil', data: this.service.list() };
  }

  @Post('upload/:slug')
  @ApiOperation({ summary: 'Upload aset marketing — OWNER/ADMIN' })
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
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any,
  ) {
    const result = this.service.upload(slug, file);
    return { message: 'Aset marketing berhasil diunggah', data: result };
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'Hapus aset marketing — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async delete(@Param('slug') slug: string) {
    this.service.delete(slug);
    return { message: 'Aset marketing berhasil dihapus' };
  }
}
