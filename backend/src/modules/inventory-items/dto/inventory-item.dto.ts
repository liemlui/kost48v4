import { IsBoolean, IsEnum, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';
import { InventoryItemStatus } from '../../../common/enums/app.enums';

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
  @IsEnum(InventoryItemStatus)
  status?: InventoryItemStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateInventoryItemDto extends CreateInventoryItemDto {}


export class StaffUpdateInventoryItemStatusDto {
  @IsEnum(InventoryItemStatus)
  status!: InventoryItemStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  photoFileKey?: string;

  @IsOptional()
  @IsString()
  photoOriginalFilename?: string;

  @IsOptional()
  @IsString()
  photoMimeType?: string;

  @IsOptional()
  @IsInt()
  photoFileSizeBytes?: number;

  @IsOptional()
  @IsBoolean()
  requestsReplacement?: boolean;

  @IsOptional()
  @IsInt()
  requestedInventoryItemId?: number;

  @IsOptional()
  @IsNumberString({}, { message: 'requestedQty harus berupa angka desimal dalam format string' })
  requestedQty?: string;
}
