import { IsInt, isNotEmpty, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UtilityType } from '../../../common/enums/app.enums';

export class CreateMeterReadingDto {
  @IsInt() @IsNotEmpty() roomId!: number;
  @IsEnum(UtilityType) utilityType!: UtilityType;
  @IsDateString() readingAt!: string;
  @IsString() readingValue!: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateMeterReadingDto {
  @IsOptional() @IsDateString() readingAt?: string;
  @IsOptional() @IsString() readingValue?: string;
  @IsOptional() @IsString() note?: string;
}
