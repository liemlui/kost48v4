import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, ValidateNested } from 'class-validator';
import { PublicRoomAvailabilityStatus } from '../../../generated/prisma';

export class PublicAvailabilityRoomDto {
  @Type(() => Number)
  @IsInt()
  roomId!: number;

  @IsEnum(PublicRoomAvailabilityStatus)
  status!: PublicRoomAvailabilityStatus;
}

export class UpdatePublicAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PublicAvailabilityRoomDto)
  rooms!: PublicAvailabilityRoomDto[];
}
