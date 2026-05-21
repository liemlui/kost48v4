import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsInt()
  tenantId!: number;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsInt()
  stayId?: number;

  @IsString()
  @IsNotEmpty({ message: 'Judul tiket wajib diisi' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi tiket wajib diisi' })
  description!: string;

  @IsOptional()
  @IsString()
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
  @IsNotEmpty({ message: 'Judul tiket wajib diisi' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi tiket wajib diisi' })
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
  CLOSE = 'CLOSE',
  CANCEL = 'CANCEL',
}

export class CloseTicketDto {
  @IsEnum(CloseTicketAction, {
    message: 'action harus salah satu dari: CLOSE, CANCEL',
  })
  action!: CloseTicketAction;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
