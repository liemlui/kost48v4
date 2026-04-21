import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsNumberString } from 'class-validator';

export class CreateBackofficeTicketDto {
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

export class CreatePortalTicketDto {
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
