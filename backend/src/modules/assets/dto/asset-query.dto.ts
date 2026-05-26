import { Transform } from 'class-transformer';
import { IsBooleanString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FixedAssetCapitalizationSource, FixedAssetCategory, FixedAssetStatus } from '../../../common/enums/app.enums';

export class FixedAssetsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(FixedAssetStatus) status?: FixedAssetStatus;
  @IsOptional() @IsEnum(FixedAssetCategory) category?: FixedAssetCategory;
  @IsOptional() @IsEnum(FixedAssetCapitalizationSource) capitalizationSource?: FixedAssetCapitalizationSource;
  @IsOptional() @IsBooleanString() depreciationEnabled?: string;
  @IsOptional() @IsNumberString() roomId?: string;
}

export class DepreciationPreviewQueryDto {
  @IsOptional() @Transform(({ value }) => Number(value)) year?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) month?: number;
}
