import { IsInt, IsNotEmpty, IsNumberString, Min } from 'class-validator';

export class ApproveBookingDto {
  @IsInt()
  @Min(1)
  agreedRentAmountRupiah!: number;

  @IsInt()
  @Min(0)
  depositAmountRupiah!: number;

  @IsNotEmpty({ message: 'Meter awal listrik harus diisi' })
  @IsNumberString({}, { message: 'Meter awal listrik harus angka desimal' })
  initialElectricityKwh!: string;

  @IsNotEmpty({ message: 'Meter awal air harus diisi' })
  @IsNumberString({}, { message: 'Meter awal air harus angka desimal' })
  initialWaterM3!: string;
}
