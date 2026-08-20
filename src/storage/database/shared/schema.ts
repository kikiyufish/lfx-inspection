import { sql } from "drizzle-orm";
import { pgTable, serial, varchar, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 巡店检查主表
export const inspections = pgTable(
  "inspections",
  {
    id: serial().primaryKey(),
    store_name: varchar("store_name", { length: 255 }).notNull(),
    inspection_date: varchar("inspection_date", { length: 20 }).notNull(),
    supervisor_name: varchar("supervisor_name", { length: 128 }).notNull(),
    total_score: integer("total_score").notNull().default(0),
    max_score: integer("max_score").notNull().default(100),
    rating: varchar("rating", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inspections_store_name_idx").on(table.store_name),
    index("inspections_date_idx").on(table.inspection_date),
    index("inspections_status_idx").on(table.status),
  ]
);

// 检查项目明细表
export const inspectionItems = pgTable(
  "inspection_items",
  {
    id: serial().primaryKey(),
    inspection_id: integer("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
    item_number: integer("item_number").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description").notNull(),
    max_score: integer("max_score").notNull(),
    actual_score: integer("actual_score").notNull().default(0),
    notes: text("notes"),
    photo_keys: jsonb("photo_keys"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inspection_items_inspection_id_idx").on(table.inspection_id),
    index("inspection_items_item_number_idx").on(table.item_number),
  ]
);
