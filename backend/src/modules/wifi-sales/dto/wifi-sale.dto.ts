import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateWifiSaleDto {
  @IsDateString() saleDate!: string;
  @IsString() customerName!: string;
  @IsString() packageName!: string;
  @IsInt() @Min(0) soldPriceRupiah!: number;
  @IsOptional() @IsString() note?: string;
}
export class UpdateWifiSaleDto {
  @IsOptional() @IsDateString() saleDate?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() packageName?: string;
  @IsOptional() @IsInt() @Min(0) soldPriceRupiah?: number;
  @IsOptional() @IsString() note?: string;
}
