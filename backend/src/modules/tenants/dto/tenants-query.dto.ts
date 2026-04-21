import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Gender } from '../../../common/enums/app.enums';

export class TenantsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsBooleanString() isActive?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() originCity?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() companyOrCampus?: string;
}
