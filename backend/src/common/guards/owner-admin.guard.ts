import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/app.enums';

export function assertOwnerOrAdmin(actor: { role: string }, context: string): void {
  if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role as UserRole)) {
    throw new ForbiddenException(
      `Staff hanya boleh melihat data ${context}. Perubahan hanya boleh dilakukan Owner/Admin.`,
    );
  }
}
