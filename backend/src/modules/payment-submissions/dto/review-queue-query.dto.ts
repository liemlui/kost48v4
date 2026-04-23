import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaymentMethod, PaymentSubmissionStatus } from '../../../common/enums/app.enums';

export class ReviewQueueQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentSubmissionStatus)
  status?: PaymentSubmissionStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsNumberString({}, { message: 'roomId harus berupa angka' })
  roomId?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'tenantId harus berupa angka' })
  tenantId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
