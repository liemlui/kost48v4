import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const REWARD_TYPES = ['RENT_DISCOUNT', 'SERVICE_ADDON', 'METER_DISCOUNT', 'BADGE', 'PHYSICAL'] as const;

export class CreateRewardDto {
  @IsString() @MaxLength(120)
  name!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsInt() @Min(1)
  pointCost!: number;

  @IsIn(REWARD_TYPES as unknown as string[])
  type!: (typeof REWARD_TYPES)[number];

  @IsOptional() @IsInt() @Min(0)
  valueRupiah?: number;

  @IsOptional() @IsInt() @Min(0)
  stockQty?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  // F4-13b: reward yang jadi tugas staf saat FULFILLED.
  @IsOptional() @IsString() @MaxLength(60)
  fulfillmentTaskCategory?: string;

  @IsOptional() @IsString() @MaxLength(160)
  fulfillmentTaskTitle?: string;
}

export class UpdateRewardDto {
  @IsOptional() @IsString() @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsInt() @Min(1)
  pointCost?: number;

  @IsOptional() @IsIn(REWARD_TYPES as unknown as string[])
  type?: (typeof REWARD_TYPES)[number];

  @IsOptional() @IsInt() @Min(0)
  valueRupiah?: number;

  @IsOptional() @IsInt() @Min(0)
  stockQty?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsString() @MaxLength(60)
  fulfillmentTaskCategory?: string;

  @IsOptional() @IsString() @MaxLength(160)
  fulfillmentTaskTitle?: string;
}

export class RequestRedemptionDto {
  @IsInt() @Min(1)
  rewardId!: number;
}

export class DecideRedemptionDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}
