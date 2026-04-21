import { IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';
import { InventoryMovementType } from '../../../common/enums/app.enums';

export class CreateInventoryMovementDto {
  @IsInt()
  itemId!: number;

  @IsEnum(InventoryMovementType)
  movementType!: InventoryMovementType;

  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty!: string;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsDateString()
  movementDate!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateInventoryMovementDto {
  @IsOptional()
  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty?: string;

  @IsOptional()
  @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementType;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsDateString()
  movementDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
