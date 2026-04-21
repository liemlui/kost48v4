import { IsDateString, IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UtilityType } from '../../../common/enums/app.enums';

export class MeterReadingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsNumberString({}, { message: 'roomId harus berupa angka' })
  roomId?: string;

  @IsOptional()
  @IsEnum(UtilityType)
  utilityType?: UtilityType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
