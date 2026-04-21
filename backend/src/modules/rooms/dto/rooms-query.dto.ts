import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { RoomStatus } from '../../../common/enums/app.enums';

export class RoomsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @IsOptional() @IsBooleanString() isActive?: string;
  @IsOptional() @IsString() floor?: string;
}
