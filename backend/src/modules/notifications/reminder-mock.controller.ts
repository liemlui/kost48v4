import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { MockSendDto } from './dto/mock-send.dto';
import { ReminderMockService } from './reminder-mock.service';

@ApiTags('admin-reminder-mock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('admin/reminders/mock-send')
export class ReminderMockController {
  constructor(private readonly reminderMockService: ReminderMockService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async mockSend(@Body() dto: MockSendDto, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.reminderMockService.mockSend({
      type: dto.type,
      candidateId: dto.candidateId,
      phone: dto.phone,
      message: dto.message,
      actorUserId: user.id,
    });

    return {
      message: 'Mock send berhasil (WhatsApp tidak dikirim)',
      data: result,
    };
  }
}
