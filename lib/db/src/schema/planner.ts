import { pgTable, serial, integer, real, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { franchisesTable, usersTable } from "./users";

export const PLANNER_INDICATORS = [
  // 1. Recrutamento
  { key: "reunioes_agendadas", label: "Reuniões agendadas", category: "recrutamento" },
  { key: "reunioes_realizadas", label: "Reuniões realizadas", category: "recrutamento" },
  { key: "corretores_entraram", label: "Corretores entraram", category: "recrutamento" },
  { key: "estagiarios_entraram", label: "Estagiários entraram", category: "recrutamento" },
  { key: "corretores_sairam", label: "Corretores saíram", category: "recrutamento" },
  { key: "estagiarios_sairam", label: "Estagiários saíram", category: "recrutamento" },
  // 2. Operação
  { key: "novos_contratos_representacao", label: "Novos contratos de representação", category: "operacao" },
  { key: "contratos_cancelados", label: "Contratos cancelados", category: "operacao" },
  { key: "contratos_vendidos", label: "Contratos vendidos", category: "operacao" },
  // 3. Vendas
  { key: "venda_assinada", label: "Venda assinada (R$)", category: "vendas" },
  { key: "venda_realizada", label: "Venda realizada (R$)", category: "vendas" },
] as const;

export type PlannerIndicatorKey = typeof PLANNER_INDICATORS[number]["key"];

export const weeklyPlannerEntriesTable = pgTable("weekly_planner_entries", {
  id: serial("id").primaryKey(),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  weekStartDate: text("week_start_date").notNull(), // ISO date string YYYY-MM-DD (Monday)
  indicatorKey: text("indicator_key").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  value: real("value"),
  meta: real("meta"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("planner_entry_unique").on(t.franchiseId, t.weekStartDate, t.indicatorKey, t.dayOfWeek),
]);

export const insertWeeklyPlannerEntrySchema = createInsertSchema(weeklyPlannerEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWeeklyPlannerEntry = z.infer<typeof insertWeeklyPlannerEntrySchema>;
export type WeeklyPlannerEntry = typeof weeklyPlannerEntriesTable.$inferSelect;

export const weeklyPlannerWeeksTable = pgTable("weekly_planner_weeks", {
  id: serial("id").primaryKey(),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  weekStartDate: text("week_start_date").notNull(),
  gapsText: text("gaps_text"),
  actionsText: text("actions_text"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  submittedByUserId: integer("submitted_by_user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("planner_week_unique").on(t.franchiseId, t.weekStartDate),
]);

export type WeeklyPlannerWeek = typeof weeklyPlannerWeeksTable.$inferSelect;
