import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import {
  BACKOFFICE_TICKET_CATEGORIES,
  InventoryItemStatus,
  RoomItemStatus,
} from "../../../common/enums/app.enums";

export class TicketImageFieldsDto {
  @IsOptional()
  @IsString()
  issueImageUrl?: string;

  @IsOptional()
  @IsString()
  issueImageFileKey?: string;

  @IsOptional()
  @IsString()
  issueImageOriginalFilename?: string;

  @IsOptional()
  @IsString()
  issueImageMimeType?: string;

  @IsOptional()
  @IsInt()
  issueImageFileSizeBytes?: number;
}

export class CreateBackofficeTicketDto extends TicketImageFieldsDto {
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsInt()
  stayId?: number;

  @IsString()
  @IsNotEmpty({ message: "Judul tiket wajib diisi" })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: "Deskripsi tiket wajib diisi" })
  description!: string;

  @IsOptional()
  @IsIn(BACKOFFICE_TICKET_CATEGORIES as unknown as string[], { message: "Kategori tiket backoffice tidak valid" })
  category?: string;
}

export class CreatePortalTicketDto extends TicketImageFieldsDto {
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsInt()
  stayId?: number;

  @IsString()
  @IsNotEmpty({ message: "Judul tiket wajib diisi" })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: "Deskripsi tiket wajib diisi" })
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class AssignTicketDto {
  @IsInt()
  assignedToId!: number;
}

export class ResolutionDto {
  @IsOptional()
  @IsString()
  resolutionNote?: string;

  @IsOptional()
  @IsString()
  resolutionImageUrl?: string;

  @IsOptional()
  @IsString()
  resolutionImageFileKey?: string;

  @IsOptional()
  @IsString()
  resolutionImageOriginalFilename?: string;

  @IsOptional()
  @IsString()
  resolutionImageMimeType?: string;

  @IsOptional()
  @IsInt()
  resolutionImageFileSizeBytes?: number;
}

export enum CloseTicketAction {
  CLOSE = "CLOSE",
  CANCEL = "CANCEL",
}

export class CloseTicketDto {
  @IsEnum(CloseTicketAction, {
    message: "action harus salah satu dari: CLOSE, CANCEL",
  })
  action!: CloseTicketAction;

  @IsOptional()
  @IsString()
  resolutionNote?: string;

  @IsOptional()
  @IsInt()
  finalRoomItemId?: number;

  @IsOptional()
  @IsEnum(RoomItemStatus, {
    message: "finalRoomItemStatus tidak sesuai dengan status barang kamar",
  })
  finalRoomItemStatus?: RoomItemStatus;

  @IsOptional()
  @IsInt()
  finalInventoryItemId?: number;

  @IsOptional()
  @IsEnum(InventoryItemStatus, {
    message:
      "finalInventoryItemStatus tidak sesuai dengan status barang gudang",
  })
  finalInventoryItemStatus?: InventoryItemStatus;

  @IsOptional()
  @IsString()
  @MinLength(8, {
    message: "Catatan final admin wajib diisi minimal 8 karakter.",
  })
  finalAdminNote?: string;
}