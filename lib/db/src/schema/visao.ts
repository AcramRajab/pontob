import { pgTable, serial, integer, real, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { franchisesTable } from "./users";

export const franchiseVisaoTable = pgTable("franchise_visao", {
  id: serial("id").primaryKey(),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  year: integer("year").notNull(),
  statement: text("statement"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("franchise_visao_unique").on(t.franchiseId, t.year),
]);

export const insertFranchiseVisaoSchema = createInsertSchema(franchiseVisaoTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchiseVisao = z.infer<typeof insertFranchiseVisaoSchema>;
export type FranchiseVisao = typeof franchiseVisaoTable.$inferSelect;

export const franchiseVisaoMilestonesTable = pgTable("franchise_visao_milestones", {
  id: serial("id").primaryKey(),
  visaoId: integer("visao_id").notNull().references(() => franchiseVisaoTable.id),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  year: integer("year").notNull(),
  quarterDate: text("quarter_date").notNull(),   // YYYY-MM-DD (last day of quarter)
  quarterLabel: text("quarter_label").notNull(),  // e.g. "1ºTRI", "2ºTRI"
  targetCreci: integer("target_creci"),
  targetCres: integer("target_cres"),
  targetVgh: real("target_vgh"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("franchise_visao_milestone_unique").on(t.visaoId, t.quarterDate),
]);

export const insertFranchiseVisaoMilestoneSchema = createInsertSchema(franchiseVisaoMilestonesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchiseVisaoMilestone = z.infer<typeof insertFranchiseVisaoMilestoneSchema>;
export type FranchiseVisaoMilestone = typeof franchiseVisaoMilestonesTable.$inferSelect;
