import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { franchisesTable } from "./users";
import { goalsTable } from "./goals";

export const vagasTable = pgTable("vagas", {
  id: serial("id").primaryKey(),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  goalId: integer("goal_id").references(() => goalsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  profileSummary: text("profile_summary"),
  mustHaves: text("must_haves"),
  status: text("status").notNull().default("ativa"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVagaSchema = createInsertSchema(vagasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVaga = z.infer<typeof insertVagaSchema>;
export type Vaga = typeof vagasTable.$inferSelect;

export const candidatosTable = pgTable("candidatos", {
  id: serial("id").primaryKey(),
  vagaId: integer("vaga_id").notNull().references(() => vagasTable.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source"),
  currentRole: text("current_role"),
  notes: text("notes"),
  stage: text("stage").notNull().default("interessado"),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCandidatoSchema = createInsertSchema(candidatosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCandidato = z.infer<typeof insertCandidatoSchema>;
export type Candidato = typeof candidatosTable.$inferSelect;
