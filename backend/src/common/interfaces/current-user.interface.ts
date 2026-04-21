import { UserRole } from '../enums/app.enums';

export interface CurrentUserPayload {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: number | null;
  isActive: boolean;
}
