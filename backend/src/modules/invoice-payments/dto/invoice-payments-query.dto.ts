import { IsBooleanString, IsDateString, IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaymentMethod } from '../../../common/enums/app.enums';

export class InvoicePaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'invoiceId harus berupa angka' })
  invoiceId?: string;

  @IsOptional()
  @IsDateString()
  paymentDateFrom?: string;

  @IsOptional()
  @IsDateString()
  paymentDateTo?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
