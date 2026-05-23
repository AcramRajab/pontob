import { pgTable, serial, text, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const dimensionsTable = pgTable("dimensions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("dimensions_name_unique").on(t.name),
]);

export const insertDimensionSchema = createInsertSchema(dimensionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDimension = z.infer<typeof insertDimensionSchema>;
export type Dimension = typeof dimensionsTable.$inferSelect;

export const keyProcessesTable = pgTable("key_processes", {
  id: serial("id").primaryKey(),
  dimensionId: integer("dimension_id").notNull().references(() => dimensionsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("key_processes_dimension_id_name_unique").on(t.dimensionId, t.name),
]);

export const insertKeyProcessSchema = createInsertSchema(keyProcessesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKeyProcess = z.infer<typeof insertKeyProcessSchema>;
export type KeyProcess = typeof keyProcessesTable.$inferSelect;

export const strategicInitiativesTable = pgTable("strategic_initiatives", {
  id: serial("id").primaryKey(),
  dimensionId: integer("dimension_id").notNull().references(() => dimensionsTable.id),
  keyProcessId: integer("key_process_id").notNull().references(() => keyProcessesTable.id),
  name: text("name").notNull(),
  kri: text("kri").notNull(),
  kpi: text("kpi").notNull(),
  description: text("description"),
  sourceDocument: text("source_document"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("strategic_initiatives_key_process_id_name_unique").on(t.keyProcessId, t.name),
]);

export const insertStrategicInitiativeSchema = createInsertSchema(strategicInitiativesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStrategicInitiative = z.infer<typeof insertStrategicInitiativeSchema>;
export type StrategicInitiative = typeof strategicInitiativesTable.$inferSelect;

export const catalogAuditLogTable = pgTable("catalog_audit_logs", {
  id: serial("id").primaryKey(),
  itemType: text("item_type").notNull(),
  itemId: integer("item_id").notNull(),
  action: text("action").notNull(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CatalogAuditLog = typeof catalogAuditLogTable.$inferSelect;
