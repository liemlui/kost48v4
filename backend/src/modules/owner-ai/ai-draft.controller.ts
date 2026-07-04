import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AiDraftService } from './ai-draft.service';
import { ListAiDraftQuery, ReviewAiDraftDto, SaveAiDraftDto } from './dto/ai-draft.dto';

/** G9: antrean draft AI. OWNER/ADMIN. Aksi domain final tetap lewat endpoint existing. */
@ApiTags('owner-ai-drafts')
@ApiBearerAuth()
@Controller('owner-ai/drafts')
export class AiDraftController {
  constructor(private readonly service: AiDraftService) {}

  @Post()
  @ApiOperation({ summary: 'Simpan draft AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async save(@Body() dto: SaveAiDraftDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.saveDraft(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar draft AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async list(@Query() query: ListAiDraftQuery) {
    return this.service.listDrafts(query);
  }

  /** Sweeper retention manual (OWNER). Static path sebelum :id agar tak bentrok. */
  @Post('run/expire')
  @ApiOperation({ summary: 'Expire draft AI lama — OWNER-only' })
  @Roles(UserRole.OWNER)
  async expire() {
    return this.service.expireOldDrafts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail draft AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDraft(id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review/keputusan draft AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewAiDraftDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.reviewDraft(id, dto.decision, user.id, dto.reviewNote);
  }
}
