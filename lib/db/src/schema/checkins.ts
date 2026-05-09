import { pgTable, serial, text, boolean, integer, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { franchisesTable, usersTable } from "./users";
import { goalsTable, goalInitiativesTable } from "./goals";

export const dailyCheckinsTable = pgTable("daily_checkins", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id),
  goalInitiativeId: integer("goal_initiative_id").references(() => goalInitiativesTable.id),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  date: date("date").notNull(),
  executedToday: text("executed_today").notNull().default("nao"),
  progressToday: real("progress_today"),
  timeSpent: text("time_spent"),
  blocker: text("blocker"),
  nextStep: text("next_step"),
  needsHelp: boolean("needs_help").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyCheckinSchema = createInsertSchema(dailyCheckinsTable).omit({ id: true, createdAt: true });
export type InsertDailyCheckin = z.infer<typeof insertDailyCheckinSchema>;
export type DailyCheckin = typeof dailyCheckinsTable.$inferSelect;

export const weeklyCheckinsTable = pgTable("weekly_checkins", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date"),
  planned: text("planned"),
  executed: text("executed"),
  progressSummary: text("progress_summary"),
  blockers: text("blockers"),
  adjustments: text("adjustments"),
  nextWeekPriority: text("next_week_priority"),
  needsRegionalSupport: boolean("needs_regional_support").notNull().default(false),
  initiativeDecision: text("initiative_decision"),
  executionPercentage: real("execution_percentage"),
  checkinDaysCount: integer("checkin_days_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWeeklyCheckinSchema = createInsertSchema(weeklyCheckinsTable).omit({ id: true, createdAt: true });
export type InsertWeeklyCheckin = z.infer<typeof insertWeeklyCheckinSchema>;
export type WeeklyCheckin = typeof weeklyCheckinsTable.$inferSelect;

export const monthlyCheckinsTable = pgTable("monthly_checkins", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goalsTable.id),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  kriProgress: text("kri_progress"),
  improvedKpis: text("improved_kpis"),
  worsenedKpis: text("worsened_kpis"),
  initiativesThatWorked: text("initiatives_that_worked"),
  initiativesThatDidNotWork: text("initiatives_that_did_not_work"),
  continueDoing: text("continue_doing"),
  stopDoing: text("stop_doing"),
  startDoing: text("start_doing"),
  nextMonthFocus: text("next_month_focus"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMonthlyCheckinSchema = createInsertSchema(monthlyCheckinsTable).omit({ id: true, createdAt: true });
export type InsertMonthlyCheckin = z.infer<typeof insertMonthlyCheckinSchema>;
export type MonthlyCheckin = typeof monthlyCheckinsTable.$inferSelect;
