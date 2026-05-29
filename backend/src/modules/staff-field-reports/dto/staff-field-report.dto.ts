import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  AdminDecision,
  InventoryMovementType,
  ReportedCondition,
  StaffFieldReportStatus,
} from "../../../common/enums/app.enums";

export class CreateStaffFieldReportDto {
  @IsOptional()
  @IsInt()
  ticketId?: number;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsInt()
  roomItemId?: number;

  @IsOptional()
  @IsInt()
  inventoryItemId?: number;

  @IsEnum(ReportedCondition)
  reportedCondition!: ReportedCondition;

  @IsString()
  @IsNotEmpty({
    message: "Catatan kondisi wajib diisi agar admin bisa mengambil keputusan.",
  })
  conditionNotes!: string;

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
  @IsNumberString(
    {},
    { message: "requestedQty harus berupa angka desimal dalam format string" },
  )
  requestedQty?: string;
}

export class StaffFieldReportsQueryDto {
  @IsOptional()
  @IsEnum(StaffFieldReportStatus)
  status?: StaffFieldReportStatus;

  @IsOptional()
  @IsNumberString()
  ticketId?: string;

  @IsOptional()
  @IsNumberString()
  roomId?: string;

  @IsOptional()
  @IsNumberString()
  roomItemId?: string;

  @IsOptional()
  @IsNumberString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  assignedToMe?: string;
}

export class FieldReportMovementDto {
  @IsInt()
  inventoryItemId!: number;

  @IsEnum(InventoryMovementType)
  movementType!: InventoryMovementType;

  @IsNumberString(
    {},
    { message: "qty harus berupa angka desimal dalam format string" },
  )
  qty!: string;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsString()
  movementDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdminReviewStaffFieldReportDto {
  @IsEnum(AdminDecision)
  adminDecision!: AdminDecision;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: "Catatan admin wajib diisi minimal 8 karakter." })
  adminNotes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FieldReportMovementDto)
  createMovement?: FieldReportMovementDto;
}
