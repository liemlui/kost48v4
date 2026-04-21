import { IsBooleanString, IsDateString, IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InventoryMovementType } from '../../../common/enums/app.enums';

export class InventoryMovementsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'itemId harus berupa angka' })
  itemId?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'roomId harus berupa angka' })
  roomId?: string;

  @IsOptional()
  @IsEnum(InventoryMovementType)
  movementType?: InventoryMovementType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
