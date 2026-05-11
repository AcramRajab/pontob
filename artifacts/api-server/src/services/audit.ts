import { db, auditLogsTable } from "@workspace/db";
import { sendAuditNotification } from "./email";
import { logger } from "../lib/logger";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntityType = "franchise" | "user" | "goal" | "initiative" | "kri";

interface AuditOpts {
  userId: number;
  userName: string;
  userEmail: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number;
  entityName?: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

export async function logAudit(opts: AuditOpts): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: opts.userId,
      userName: opts.userName,
      userEmail: opts.userEmail,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      entityName: opts.entityName ?? null,
      oldData: opts.oldData ?? null,
      newData: opts.newData ?? null,
    });

    sendAuditNotification({
      actorName: opts.userName,
      actorEmail: opts.userEmail,
      action: opts.action,
      entityType: opts.entityType,
      entityName: opts.entityName ?? String(opts.entityId ?? ""),
      oldData: opts.oldData,
      newData: opts.newData,
    }).catch(err => logger.error({ err }, "Failed to send audit email"));
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}

export function shouldAudit(userRole: string): boolean {
  return userRole === "staff_regional";
}
