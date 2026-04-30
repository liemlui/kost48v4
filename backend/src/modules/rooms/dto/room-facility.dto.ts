import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomFacilityDto {
  @IsString() name!: string;

  @IsOptional() @IsInt() @Min(1) quantity?: number;

  @IsOptional() @IsString() category?: string;

  @IsOptional() @IsBoolean() publicVisible?: boolean;

  @IsOptional() @IsString() condition?: string;

  @IsOptional() @IsString() note?: string;
}

export class UpdateRoomFacilityDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsInt() @Min(1) quantity?: number;

  @IsOptional() @IsString() category?: string;

  @IsOptional() @IsBoolean() publicVisible?: boolean;

  @IsOptional() @IsString() condition?: string;

  @IsOptional() @IsString() note?: string;
}