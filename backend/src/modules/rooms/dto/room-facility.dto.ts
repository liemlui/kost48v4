import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomFacilityDto {
  @IsString() name!: string;

  @IsOptional() @IsInt() @Min(1) quantity?: number;

  @IsOptional() @IsString() category?: string;

  @IsOptional() @IsBoolean() publicVisible?: boolean;

  @IsOptional() @IsString() condition?: string;

  // STF-GUDANG-2: mapping eksak fasilitas → barang gudang.
  @IsOptional() @IsInt() inventoryItemId?: number;

  @IsOptional() @IsString() note?: string;
}

export class UpdateRoomFacilityDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsInt() @Min(1) quantity?: number;

  @IsOptional() @IsString() category?: string;

  @IsOptional() @IsBoolean() publicVisible?: boolean;

  @IsOptional() @IsString() condition?: string;

  // STF-GUDANG-2: mapping eksak fasilitas → barang gudang.
  @IsOptional() @IsInt() inventoryItemId?: number;

  @IsOptional() @IsString() note?: string;
}