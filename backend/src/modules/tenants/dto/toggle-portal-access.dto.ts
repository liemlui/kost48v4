import { IsBoolean } from 'class-validator';

export class TogglePortalAccessDto {
  @IsBoolean({ message: 'isActive harus berupa boolean (true/false)' })
  isActive!: boolean;
}