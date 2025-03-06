import type { Express } from "express";
import { createServer, type Server } from "http";
import webpush from "web-push";
import { insertPushSubscriptionSchema } from "@shared/schema";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys not configured");
  }

  webpush.setVapidDetails(
    'mailto:example@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const parsed = insertPushSubscriptionSchema.parse(req.body);
      const subscription = await storage.createPushSubscription(parsed);
      res.json(subscription);
    } catch (error) {
      res.status(400).json({ error: "Invalid subscription data" });
    }
  });

  app.post("/api/notifications/send", async (req, res) => {
    try {
      const subscriptions = await storage.getActivePushSubscriptions();
      
      const notifications = subscriptions.map(sub => 
        webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: req.body.title,
            body: req.body.body,
          })
        )
      );

      await Promise.all(notifications);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
