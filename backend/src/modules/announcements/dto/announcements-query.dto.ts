import { IsBooleanString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AnnouncementAudience } from '../../../common/enums/app.enums';

export class AnnouncementsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsBooleanString() isActive?: string;
  @IsOptional() @IsEnum(AnnouncementAudience) audience?: AnnouncementAudience;
  @IsOptional() @IsBooleanString() isPublished?: string;
  @IsOptional() @IsBooleanString() isPinned?: string;
}
