import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { FaqsService } from './faqs.service';

@ApiTags('faqs')
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  /** Public — no auth required */
  @Get('public')
  @ApiOperation({ summary: 'Daftar FAQ publik — tanpa auth' })
  @Public()
  async listPublic() {
    return { message: 'Daftar FAQ publik', data: await this.faqsService.listPublic() };
  }

  /** Owner/Admin — list all including inactive */
  @Get()
  @ApiOperation({ summary: 'Daftar FAQ (termasuk nonaktif) — OWNER/ADMIN' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async listAll() {
    return { message: 'Daftar FAQ', data: await this.faqsService.listAll() };
  }

  /** Owner/Admin — seed default FAQs */
  @Post('seed')
  @ApiOperation({ summary: 'Seed FAQ default — OWNER/ADMIN' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async seed() {
    return this.faqsService.seed();
  }

  /** Owner/Admin — create */
  @Post()
  @ApiOperation({ summary: 'Buat FAQ — OWNER/ADMIN' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateFaqDto) {
    return { message: 'FAQ berhasil dibuat', data: await this.faqsService.create(dto) };
  }

  /** Owner/Admin — update */
  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui FAQ — OWNER/ADMIN' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqDto) {
    return { message: 'FAQ berhasil diperbarui', data: await this.faqsService.update(id, dto) };
  }

  /** Owner/Admin — delete */
  @Delete(':id')
  @ApiOperation({ summary: 'Hapus FAQ — OWNER/ADMIN' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { message: 'FAQ berhasil dihapus', data: await this.faqsService.remove(id) };
  }
}
