import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PricingTerm } from '../../../common/enums/app.enums';

export class PublicRoomsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsEnum(PricingTerm)
  pricingTerm?: PricingTerm;

  /** PUB-SMART-BOOKING: tanggal check-in (YYYY-MM-DD) untuk filter ketersediaan. */
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  /** PUB-SMART-BOOKING: durasi menginap dalam hari, wajib jika checkIn diisi. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationDays?: number;
}
