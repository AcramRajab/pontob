import { pgTable, serial, integer, real, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { franchisesTable } from "./users";

export const franchiseKrisTable = pgTable("franchise_kris", {
  id: serial("id").primaryKey(),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  creci: integer("creci"),   // Corretores com CRECI ativo
  cres: integer("cres"),     // Contratos de Representação Exclusiva
  vgh: real("vgh"),          // Valor Geral de Honorários/Comissões (R$)
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("franchise_kris_unique").on(t.franchiseId, t.year, t.month),
]);

export const insertFranchiseKriSchema = createInsertSchema(franchiseKrisTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchiseKri = z.infer<typeof insertFranchiseKriSchema>;
export type FranchiseKri = typeof franchiseKrisTable.$inferSelect;
