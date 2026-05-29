import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';
import { InventoryMovementType } from '../../../common/enums/app.enums';

export class CreateInventoryMovementDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  itemId!: number;

  @Transform(({ obj, value }) => value ?? obj.type)
  @IsEnum(InventoryMovementType)
  movementType!: InventoryMovementType;

  @Transform(({ obj, value }) => String(value ?? obj.quantity ?? ''))
  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty!: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsDateString()
  movementDate?: string;

  @IsString()
  @MinLength(8, { message: 'Catatan mutasi stok minimal 8 karakter agar audit stok jelas' })
  note!: string;

  @IsOptional()
  @IsEnum(InventoryMovementType)
  type?: InventoryMovementType;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value)))
  @IsNumberString({}, { message: 'quantity harus berupa angka desimal dalam format string' })
  quantity?: string;
}

export class UpdateInventoryMovementDto {
  @IsOptional()
  @Transform(({ obj, value }) => {
    const next = value ?? obj.quantity;
    return next === undefined || next === null ? undefined : String(next);
  })
  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty?: string;

  @IsOptional()
  @Transform(({ obj, value }) => value ?? obj.type)
  @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementType;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsDateString()
  movementDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Catatan mutasi stok minimal 8 karakter agar audit stok jelas' })
  note?: string;

  @IsOptional()
  @IsEnum(InventoryMovementType)
  type?: InventoryMovementType;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value)))
  @IsNumberString({}, { message: 'quantity harus berupa angka desimal dalam format string' })
  quantity?: string;
}
