import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AnnouncementAudience } from '../../../common/enums/app.enums';

export class CreateAnnouncementDto {
  @IsString() title!: string;
  @IsString() content!: string;
  @IsOptional() @IsEnum(AnnouncementAudience) audience?: AnnouncementAudience;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isPinned?: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
export class UpdateAnnouncementDto extends CreateAnnouncementDto {}
