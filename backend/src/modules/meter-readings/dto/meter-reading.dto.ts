import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';
import { UtilityType } from '../../../common/enums/app.enums';

export class CreateMeterReadingDto {
  @IsInt()
  @IsNotEmpty()
  roomId!: number;

  @IsEnum(UtilityType)
  utilityType!: UtilityType;

  @IsDateString()
  readingAt!: string;

  @IsNumberString({}, { message: 'Angka meter harus berupa angka' })
  readingValue!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMeterReadingDto {
  @IsOptional()
  @IsDateString()
  readingAt?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Angka meter harus berupa angka' })
  readingValue?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
