import { IsDateString, IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DepositStatus, LeadSource, StayStatus } from '../../../common/enums/app.enums';

export class StaysQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsNumberString({}, { message: 'tenantId harus berupa angka' })
  tenantId?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'roomId harus berupa angka' })
  roomId?: string;

  @IsOptional()
  @IsEnum(StayStatus)
  status?: StayStatus;

  @IsOptional()
  @IsEnum(LeadSource)
  bookingSource?: LeadSource;

  @IsOptional()
  @IsDateString()
  checkInDateFrom?: string;

  @IsOptional()
  @IsDateString()
  checkInDateTo?: string;

  @IsOptional()
  @IsEnum(DepositStatus)
  depositStatus?: DepositStatus;
}
