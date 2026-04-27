import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class NotificationQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean({ message: 'unreadOnly harus boolean' })
  unreadOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus angka' })
  @Min(1, { message: 'limit minimal 1' })
  @Max(50, { message: 'limit maksimal 50' })
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset harus angka' })
  @Min(0, { message: 'offset minimal 0' })
  offset?: number = 0;
}

export class NotificationItemResponse {
  id!: number;
  title!: string;
  body!: string;
  linkTo!: string | null;
  entityType!: string | null;
  entityId!: string | null;
  isRead!: boolean;
  readAt!: string | null;
  createdAt!: string;
  updatedAt!: string;
}

export class NotificationListResponse {
  items!: NotificationItemResponse[];
  total!: number;
  unreadCount!: number;
}

export class MarkAllReadResponse {
  affected!: number;
}
