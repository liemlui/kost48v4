import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AiDraftService } from './ai-draft.service';
import { ListAiDraftQuery, ReviewAiDraftDto, SaveAiDraftDto } from './dto/ai-draft.dto';

/** G9: antrean draft AI. OWNER/ADMIN. Aksi domain final tetap lewat endpoint existing. */
@Controller('owner-ai/drafts')
export class AiDraftController {
  constructor(private readonly service: AiDraftService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async save(@Body() dto: SaveAiDraftDto, @CurrentUser() user: CurrentUserPayload) {
    return this.service.saveDraft(dto, user.id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async list(@Query() query: ListAiDraftQuery) {
    return this.service.listDrafts(query);
  }

  /** Sweeper retention manual (OWNER). Static path sebelum :id agar tak bentrok. */
  @Post('run/expire')
  @Roles(UserRole.OWNER)
  async expire() {
    return this.service.expireOldDrafts();
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDraft(id);
  }

  @Post(':id/review')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewAiDraftDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.reviewDraft(id, dto.decision, user.id, dto.reviewNote);
  }
}
