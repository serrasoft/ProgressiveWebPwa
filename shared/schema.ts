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
  // Verification fields
  verified: boolean("verified").notNull().default(false),
  verificationCode: varchar("verification_code", { length: 6 }),
  verificationExpiry: timestamp("verification_expiry"),
  // Store additional offline-capable profile data as JSON
  offlineData: jsonb("offline_data"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body"), // Added body field to store the message content
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

// Schema for user registration
export const registerUserSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken"),
  confirmPassword: z.string(),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: "Du måste godkänna hantering av personuppgifter"
  })
});

// Add validation to ensure passwords match
export const validatedRegisterUserSchema = registerUserSchema.refine(
  data => data.password === data.confirmPassword,
  {
    message: "Lösenorden matchar inte",
    path: ["confirmPassword"]
  }
);

// Schema for verifying a user
export const verifyUserSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  code: z.string().length(4, "Koden måste vara 4 siffror")
});

// Schema for logging in
export const loginUserSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(1, "Lösenord måste anges")
});

// Legacy schema
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
}).extend({
  email: z.string().email("Ogiltig e-postadress"),
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
  body: true,
  link: true,
  createdById: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).pick({
  userId: true,
  subscription: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type ValidatedRegisterUser = z.infer<typeof validatedRegisterUserSchema>;
export type VerifyUser = z.infer<typeof verifyUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type User = typeof users.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;