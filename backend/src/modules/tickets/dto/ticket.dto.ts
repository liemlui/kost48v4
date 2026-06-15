import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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
  @MaxLength(500)
  @Matches(
    /^\/(?:api\/tickets\/images|uploads\/ticket-images)\/[\w.-]+\.(jpg|jpeg|png|webp)$/i,
    { message: "issueImageUrl harus berupa path foto tiket yang valid" },
  )
  issueImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[\w.-]+\.(jpg|jpeg|png|webp)$/i, { message: "issueImageFileKey tidak valid" })
  issueImageFileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  issueImageOriginalFilename?: string;

  @IsOptional()
  @IsString()
  @IsIn(["image/jpeg", "image/png", "image/webp"])
  issueImageMimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2 * 1024 * 1024)
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

// F5-3 (AUD-5 / D-22.2): tandai tiket (mis. cuci AC) dikerjakan VENDOR LUAR.
// handledByVendor=true → assignee staf dikosongkan (keluar round-robin/KPI staf).
export class MarkTicketVendorDto {
  @IsBoolean()
  handledByVendor!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  vendorNote?: string;
}

export class ResolutionDto {
  @IsOptional()
  @IsString()
  resolutionNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(
    /^\/(?:api\/tickets\/images|uploads\/ticket-images)\/[\w.-]+\.(jpg|jpeg|png|webp)$/i,
    { message: "resolutionImageUrl harus berupa path foto tiket yang valid" },
  )
  resolutionImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[\w.-]+\.(jpg|jpeg|png|webp)$/i, { message: "resolutionImageFileKey tidak valid" })
  resolutionImageFileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  resolutionImageOriginalFilename?: string;

  @IsOptional()
  @IsString()
  @IsIn(["image/jpeg", "image/png", "image/webp"])
  resolutionImageMimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2 * 1024 * 1024)
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
