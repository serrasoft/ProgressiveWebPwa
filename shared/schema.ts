import { pgTable, text, serial, jsonb, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: varchar("display_name", { length: 100 }),
  apartmentNumber: varchar("apartment_number", { length: 10 }),
  port: varchar("port", { length: 10 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  // Store additional offline-capable profile data as JSON
  offlineData: jsonb("offline_data"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: serial("created_by_id").references(() => users.id),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  subscription: jsonb("subscription").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
}).extend({
  email: z.string().email("Ogiltig e-postadress"),
  // We don't validate password since it's pre-filled
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Namn måste anges"),
  apartmentNumber: z.string()
    .refine(val => !val || (Number(val) >= 1 && Number(val) <= 165), 
      "Lägenhetsnummer måste vara mellan 1 och 165"),
  port: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  title: true,
  link: true,
  createdById: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).pick({
  userId: true,
  subscription: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type User = typeof users.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;