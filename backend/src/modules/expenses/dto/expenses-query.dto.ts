import { IsBooleanString, IsDateString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ExpenseCategory, ExpenseType } from '../../../common/enums/app.enums';

export class ExpensesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsDateString()
  expenseDateFrom?: string;

  @IsOptional()
  @IsDateString()
  expenseDateTo?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'roomId harus berupa angka' })
  roomId?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'stayId harus berupa angka' })
  stayId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
