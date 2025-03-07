import { users, notifications, pushSubscriptions, type User, type InsertUser, type PushSubscription, type Notification } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPushSubscription(subscription: any): Promise<PushSubscription>;
  getActivePushSubscriptions(): Promise<PushSubscription[]>;
  getNotifications(): Promise<Notification[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createPushSubscription(data: any): Promise<PushSubscription> {
    const [subscription] = await db
      .insert(pushSubscriptions)
      .values(data)
      .returning();
    return subscription;
  }

  async getActivePushSubscriptions(): Promise<PushSubscription[]> {
    return db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.active, true));
  }

  async getNotifications(): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));
  }
}

export const storage = new DatabaseStorage();