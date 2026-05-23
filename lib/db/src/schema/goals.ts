import { pgTable, serial, text, boolean, integer, timestamp, real, date, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { franchisesTable } from "./users";
import { dimensionsTable, keyProcessesTable, strategicInitiativesTable } from "./dimensions";
import { usersTable } from "./users";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  dimensionId: integer("dimension_id").notNull().references(() => dimensionsTable.id),
  keyProcessId: integer("key_process_id").notNull().references(() => keyProcessesTable.id),
  title: text("title").notNull(),
  kriDescription: text("kri_description"),
  currentValue: real("current_value"),
  targetValue: real("target_value"),
  unit: text("unit"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  ownerUserId: integer("owner_user_id").references(() => usersTable.id),
  frequency: text("frequency"),
  status: text("status").notNull().default("nao_iniciada"),
  progressPercentage: real("progress_percentage").notNull().default(0),
  riskStatus: text("risk_status"),
  score: real("score").notNull().default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: integer("deleted_by_user_id"),
  deletedByName: text("deleted_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("goals_franchise_keyprocess_startdate_uniq").on(t.franchiseId, t.keyProcessId, t.startDate).where(sql`start_date IS NOT NULL`),
]);

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;

export const kpisTable = pgTable("kpis", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id),
  name: text("name").notNull(),
  initialValue: real("initial_value"),
  currentValue: real("current_value"),
  targetValue: real("target_value"),
  unit: text("unit"),
  frequency: text("frequency"),
  indicatorType: text("indicator_type").notNull().default("numero_absoluto"),
  desiredDirection: text("desired_direction").notNull().default("aumentar"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: integer("deleted_by_user_id"),
  deletedByName: text("deleted_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKpiSchema = createInsertSchema(kpisTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKpi = z.infer<typeof insertKpiSchema>;
export type Kpi = typeof kpisTable.$inferSelect;

export const goalInitiativesTable = pgTable("goal_initiatives", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id),
  strategicInitiativeId: integer("strategic_initiative_id").references(() => strategicInitiativesTable.id),
  customName: text("custom_name"),
  desiredResult: text("desired_result"),
  actualResult: text("actual_result"),
  mainKpiId: integer("main_kpi_id"),
  ownerUserId: integer("owner_user_id").references(() => usersTable.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  frequency: text("frequency"),
  executionDay: text("execution_day"),
  executionTime: text("execution_time"),
  estimatedTime: text("estimated_time"),
  whatWillBeDone: text("what_will_be_done"),
  whyItMatters: text("why_it_matters"),
  whoIsResponsible: text("who_is_responsible"),
  whereItWillBeDone: text("where_it_will_be_done"),
  howItWillBeDone: text("how_it_will_be_done"),
  investmentOrEffort: text("investment_or_effort"),
  progressPercentage: real("progress_percentage").notNull().default(0),
  status: text("status").notNull().default("ativa"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: integer("deleted_by_user_id"),
  deletedByName: text("deleted_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("goal_initiatives_goal_initiative_uniq").on(t.goalId, t.strategicInitiativeId).where(sql`strategic_initiative_id IS NOT NULL`),
]);

export const insertGoalInitiativeSchema = createInsertSchema(goalInitiativesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoalInitiative = z.infer<typeof insertGoalInitiativeSchema>;
export type GoalInitiative = typeof goalInitiativesTable.$inferSelect;
