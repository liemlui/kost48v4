import { IsDateString, IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InvoiceStatus } from '../../../common/enums/app.enums';

export class InvoicesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsNumberString({}, { message: 'stayId harus berupa angka' })
  stayId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  periodStartFrom?: string;

  @IsOptional()
  @IsDateString()
  periodEndTo?: string;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;
}
