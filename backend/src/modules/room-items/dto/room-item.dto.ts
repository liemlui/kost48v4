import { IsBoolean, IsEnum, IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';
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


export class StaffUpdateRoomItemStatusDto {
  @IsEnum(RoomItemStatus)
  status!: RoomItemStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  photoFileKey?: string;

  @IsOptional()
  @IsString()
  photoOriginalFilename?: string;

  @IsOptional()
  @IsString()
  photoMimeType?: string;

  @IsOptional()
  @IsInt()
  photoFileSizeBytes?: number;

  @IsOptional()
  @IsBoolean()
  requestsReplacement?: boolean;

  @IsOptional()
  @IsInt()
  requestedInventoryItemId?: number;

  @IsOptional()
  @IsNumberString({}, { message: 'requestedQty harus berupa angka desimal dalam format string' })
  requestedQty?: string;
}
