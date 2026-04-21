import { IsEnum, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';
import { RoomItemStatus } from '../../../common/enums/app.enums';

export class CreateRoomItemDto {
  @IsInt()
  roomId!: number;

  @IsInt()
  itemId!: number;

  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty!: string;

  @IsOptional()
  @IsEnum(RoomItemStatus)
  status?: RoomItemStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateRoomItemDto {
  @IsOptional()
  @IsNumberString({}, { message: 'qty harus berupa angka desimal dalam format string' })
  qty?: string;

  @IsOptional()
  @IsEnum(RoomItemStatus)
  status?: RoomItemStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
