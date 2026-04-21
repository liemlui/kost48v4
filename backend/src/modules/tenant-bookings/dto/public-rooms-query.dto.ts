import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PricingTerm } from '../../../common/enums/app.enums';

export class PublicRoomsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsEnum(PricingTerm)
  pricingTerm?: PricingTerm;
}
