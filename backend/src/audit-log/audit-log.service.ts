import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    actorUserId?: number | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldData?: unknown;
    newData?: unknown;
    meta?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldData: input.oldData as Prisma.InputJsonValue,
        newData: input.newData as Prisma.InputJsonValue,
        meta: input.meta as Prisma.InputJsonValue,
      },
    });
  }
}
