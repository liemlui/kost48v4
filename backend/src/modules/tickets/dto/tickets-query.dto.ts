import { IsEnum, IsOptional, IsNumberString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TicketStatus } from '../../../common/enums/app.enums';

export class TicketsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsNumberString({}, { message: 'tenantId harus berupa angka' })
  tenantId?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'roomId harus berupa angka' })
  roomId?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'stayId harus berupa angka' })
  stayId?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'assignedToId harus berupa angka' })
  assignedToId?: string;
}
