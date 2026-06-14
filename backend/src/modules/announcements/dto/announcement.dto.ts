import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AnnouncementAudience } from '../../../common/enums/app.enums';

export class CreateAnnouncementDto {
  @IsString() title!: string;
  @IsString() content!: string;
  @IsOptional() @IsEnum(AnnouncementAudience) audience?: AnnouncementAudience;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isPinned?: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^\/api\/announcements\/images\/[\w.-]+\.(jpg|jpeg|png|webp)$/i)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[\w.-]+\.(jpg|jpeg|png|webp)$/i)
  imageFileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageOriginalFilename?: string;

  @IsOptional()
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  imageMimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2 * 1024 * 1024)
  imageFileSizeBytes?: number;
}
export class UpdateAnnouncementDto extends CreateAnnouncementDto {}
