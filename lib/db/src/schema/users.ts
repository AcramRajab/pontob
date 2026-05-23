import { pgTable, serial, text, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const franchisesTable = pgTable("franchises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  brokerOwnerName: text("broker_owner_name"),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  cnpj: text("cnpj"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique("franchises_name_unique").on(t.name),
]);

export const insertFranchiseSchema = createInsertSchema(franchisesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFranchise = z.infer<typeof insertFranchiseSchema>;
export type Franchise = typeof franchisesTable.$inferSelect;

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("responsavel_interno"),
  franchiseId: integer("franchise_id").references(() => franchisesTable.id),
  active: boolean("active").notNull().default(true),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// Many-to-many: sócio users linked to multiple franchises
export const userFranchisesTable = pgTable("user_franchises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  franchiseId: integer("franchise_id").notNull().references(() => franchisesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("user_franchises_unique").on(t.userId, t.franchiseId),
]);

export type UserFranchise = typeof userFranchisesTable.$inferSelect;
