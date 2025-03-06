import { users, pushSubscriptions, type User, type InsertUser, type PushSubscription } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPushSubscription(subscription: any): Promise<PushSubscription>;
  getActivePushSubscriptions(): Promise<PushSubscription[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private subscriptions: Map<number, PushSubscription>;
  currentId: number;
  currentSubscriptionId: number;

  constructor() {
    this.users = new Map();
    this.subscriptions = new Map();
    this.currentId = 1;
    this.currentSubscriptionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createPushSubscription(data: any): Promise<PushSubscription> {
    const id = this.currentSubscriptionId++;
    const subscription: PushSubscription = {
      id,
      userId: data.userId,
      subscription: data.subscription,
      active: true,
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async getActivePushSubscriptions(): Promise<PushSubscription[]> {
    return Array.from(this.subscriptions.values()).filter(sub => sub.active);
  }
}

export const storage = new MemStorage();