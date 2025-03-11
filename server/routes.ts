import type { Express } from "express";
import { createServer, type Server } from "http";
import webpush from "web-push";
import { insertPushSubscriptionSchema, insertUserSchema } from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import { ZodError } from "zod";
import session from "express-session";

// Middleware to check if user is authenticated
const requireAuth = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup session middleware
  app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const { email } = req.body;

      // Check if user already exists
      const existingUser = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email));

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "E-postadressen är redan registrerad" });
      }

      // Create new user
      const [user] = await db.insert(schema.users)
        .values({
          email,
          password: "brf-docenten-2024", // Pre-filled password
          offlineData: {}
        })
        .returning();

      req.session.userId = user.id;
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Kunde inte skapa konto" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const [user] = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email));

      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Fel e-postadress eller lösenord" });
      }

      req.session.userId = user.id;
      res.json({ success: true });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Kunde inte logga in" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Protected profile routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const [user] = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, req.session.userId!));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        email: user.email,
        displayName: user.displayName,
        apartmentNumber: user.apartmentNumber,
        port: user.port,
        phoneNumber: user.phoneNumber,
        offlineData: user.offlineData,
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const [user] = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, req.session.userId!));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const [updatedUser] = await db.update(schema.users)
        .set({
          displayName: req.body.displayName,
          apartmentNumber: req.body.apartmentNumber,
          port: req.body.port,
          phoneNumber: req.body.phoneNumber,
          offlineData: {
            ...user.offlineData,
            ...req.body,
            lastUpdated: new Date().toISOString(),
          },
        })
        .where(eq(schema.users.id, req.session.userId!))
        .returning();

      res.json({
        displayName: updatedUser.displayName,
        apartmentNumber: updatedUser.apartmentNumber,
        port: updatedUser.port,
        phoneNumber: updatedUser.phoneNumber,
        offlineData: updatedUser.offlineData,
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Add these endpoints before the existing routes
  app.get("/api/users/test", async (_req, res) => {
    try {
      // First try to find existing test user
      let [user] = await db.select().from(schema.users).where(eq(schema.users.username, 'testuser'));

      // If no test user exists, create one
      if (!user) {
        console.log('Creating test user...');
        const testUser = {
          username: 'testuser',
          password: 'testpass',
          displayName: 'Test User',
        };
        [user] = await db.insert(schema.users).values(testUser).returning();
        console.log('Test user created:', user);
      }

      res.json({ id: user.id });
    } catch (error) {
      console.error('Failed to fetch/create test user:', error);
      res.status(500).json({ error: "Failed to fetch/create test user" });
    }
  });

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("Warning: VAPID keys not configured - push notifications will be unavailable");
    return httpServer;
  }

  webpush.setVapidDetails(
    'mailto:example@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  app.get("/api/notifications", async (_req, res) => {
    try {
      const notifications = await storage.getNotifications();
      console.log('Fetched notifications:', notifications);
      res.json(notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }

      // Delete the notification
      await db.delete(schema.notifications)
        .where(eq(schema.notifications.id, id))
        .execute();

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      console.log('Received subscription request:', req.body);

      // First verify the user exists
      const user = await storage.getUser(req.body.userId);
      if (!user) {
        console.error('User not found:', req.body.userId);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      let parsed;
      try {
        parsed = insertPushSubscriptionSchema.parse(req.body);
        console.log('Validated subscription data:', parsed);
      } catch (error) {
        if (error instanceof ZodError) {
          console.error('Subscription validation error:', error.errors);
          return res.status(400).json({ error: "Invalid subscription data", details: error.errors });
        }
        throw error;
      }

      console.log('Creating push subscription:', parsed);
      const subscription = await storage.createPushSubscription(parsed);
      console.log('Push subscription created:', subscription);
      res.json(subscription);
    } catch (error) {
      console.error('Subscription error:', error);
      res.status(400).json({ error: "Invalid subscription data" });
    }
  });

  app.post("/api/notifications/send", async (req, res) => {
    try {
      const subscriptions = await storage.getActivePushSubscriptions();
      console.log('Found active subscriptions:', subscriptions.length);

      if (subscriptions.length === 0) {
        return res.status(400).json({ error: "No active subscriptions found" });
      }

      // First save the notification to the database
      const [notification] = await db.insert(schema.notifications)
        .values({
          title: req.body.title,
          link: req.body.link,
          createdAt: new Date(),
        })
        .returning();

      console.log('Created notification:', notification);

      const payload = JSON.stringify({
        title: req.body.title,
        body: req.body.body,
        url: req.body.link || '/', // Use provided link or default to home
      });
      console.log('Sending notification payload:', payload);

      const notifications = subscriptions.map(sub => {
        console.log('Sending notification to subscription:', sub.id, sub.subscription);
        return webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          payload
        ).catch(error => {
          console.error(`Failed to send notification to subscription ${sub.id}:`, error);
          if (error.statusCode === 410) {
            // Subscription has expired or is invalid
            console.log(`Subscription ${sub.id} is no longer valid`);
          }
          return null;
        });
      });

      const results = await Promise.all(notifications);
      const successCount = results.filter(Boolean).length;
      console.log(`Successfully sent ${successCount} notifications`);

      res.json({ success: true, sent: successCount });
    } catch (error) {
      console.error('Failed to send notifications:', error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  return httpServer;
}