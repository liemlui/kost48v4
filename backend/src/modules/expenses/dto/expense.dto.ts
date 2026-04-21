import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ExpenseCategory, ExpenseType } from '../../../common/enums/app.enums';

export class CreateExpenseDto {
  @IsDateString() expenseDate!: string;
  @IsEnum(ExpenseType) type!: ExpenseType;
  @IsEnum(ExpenseCategory) category!: ExpenseCategory;
  @IsString() description!: string;
  @IsInt() @Min(0) amountRupiah!: number;
  @IsOptional() @IsString() vendorName?: string;
  @IsOptional() roomId?: number;
  @IsOptional() stayId?: number;
  @IsOptional() @IsString() note?: string;
}
export class UpdateExpenseDto {
  @IsOptional() @IsDateString() expenseDate?: string;
  @IsOptional() @IsEnum(ExpenseType) type?: ExpenseType;
  @IsOptional() @IsEnum(ExpenseCategory) category?: ExpenseCategory;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) amountRupiah?: number;
  @IsOptional() @IsString() vendorName?: string;
  @IsOptional() roomId?: number;
  @IsOptional() stayId?: number;
  @IsOptional() @IsString() note?: string;
}
