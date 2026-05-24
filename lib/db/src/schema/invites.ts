import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { franchisesTable, usersTable } from "./users";

export const inviteTokensTable = pgTable("invite_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  role: text("role").notNull(),
  createdBy: integer("created_by").references(() => usersTable.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedByUserId: integer("used_by_user_id").references(() => usersTable.id),
  approvalToken: text("approval_token").unique(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InviteToken = typeof inviteTokensTable.$inferSelect;
