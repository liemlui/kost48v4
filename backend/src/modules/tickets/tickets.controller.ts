import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  AssignTicketDto,
  CloseTicketDto,
  CreateBackofficeTicketDto,
  CreatePortalTicketDto,
  ResolutionDto,
} from './dto/ticket.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { TicketsService } from './tickets.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: TicketsQueryDto) {
    return { message: 'Daftar tiket berhasil diambil', data: await this.ticketsService.findAll(query) };
  }

  @Get('my')
  @Roles(UserRole.TENANT)
  async findMine(@CurrentUser() user: CurrentUserPayload, @Query() query: TicketsQueryDto) {
    return { message: 'Daftar tiket saya berhasil diambil', data: await this.ticketsService.findMine(user, query) };
  }


  @Post('upload-image')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'ticket-images');
          if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        },
        filename: (_req, file, cb) => {
          const safeBase = (file.originalname || 'ticket-image')
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .slice(0, 60) || 'ticket-image';
          cb(null, `${Date.now()}-${safeBase}${extname(file.originalname || '.jpg')}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Foto tiket hanya menerima JPG, PNG, atau WebP'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Foto tiket wajib dipilih');
    return {
      message: 'Foto tiket berhasil diunggah',
      data: {
        fileKey: file.filename,
        fileUrl: `/uploads/ticket-images/${file.filename}`,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail tiket berhasil diambil', data: await this.ticketsService.findOne(id, user) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateBackofficeTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil dibuat', data: await this.ticketsService.createBackoffice(dto, user) };
  }

  @Post('portal')
  @Roles(UserRole.TENANT)
  async createPortal(@Body() dto: CreatePortalTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil dibuat', data: await this.ticketsService.createPortal(dto, user) };
  }

  @Post(':id/assign')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil di-assign', data: await this.ticketsService.assign(id, dto, user) };
  }

  @Post(':id/start')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil diproses', data: await this.ticketsService.start(id, user) };
  }

  @Post(':id/mark-done')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async markDone(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolutionDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Tiket berhasil ditandai selesai', data: await this.ticketsService.markDone(id, dto, user) };
  }

  @Post(':id/close')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async close(@Param('id', ParseIntPipe) id: number, @Body() dto: CloseTicketDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Status tiket berhasil diperbarui', data: await this.ticketsService.close(id, dto, user) };
  }
}
