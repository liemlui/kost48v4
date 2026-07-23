import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InventoryItemStatus } from '../../../common/enums/app.enums';

export class InventoryItemsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBooleanString() isActive?: string;
  @IsOptional() @IsBooleanString() lowStockOnly?: string;
  @IsOptional() @IsString() status?: InventoryItemStatus;
}
