import { IsBoolean, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateInventoryItemDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'qtyOnHand harus berupa angka desimal dalam format string' })
  qtyOnHand?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'minQty harus berupa angka desimal dalam format string' })
  minQty?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateInventoryItemDto extends CreateInventoryItemDto {}
