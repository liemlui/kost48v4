import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString({ message: 'keys.p256dh wajib string' })
  p256dh!: string;

  @IsString({ message: 'keys.auth wajib string' })
  auth!: string;
}

export class SubscribePushDto {
  @IsString({ message: 'endpoint wajib string' })
  endpoint!: string;

  @IsObject({ message: 'keys wajib objek { p256dh, auth }' })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class UnsubscribePushDto {
  @IsString({ message: 'endpoint wajib string' })
  endpoint!: string;
}
