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
    console.log('Creating push subscription with data:', data);
    try {
      const [subscription] = await db
        .insert(pushSubscriptions)
        .values(data)
        .returning();
      console.log('Successfully created push subscription:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to create push subscription:', error);
      throw error;
    }
  }

  async getActivePushSubscriptions(): Promise<PushSubscription[]> {
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.active, true));
    console.log('Retrieved active subscriptions:', subscriptions);
    return subscriptions;
  }

  async getNotifications(): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));
  }
}

export const storage = new DatabaseStorage();