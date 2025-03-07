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

      const notifications = subscriptions.map(sub => {
        console.log('Sending notification to subscription:', sub.id);
        return webpush.sendNotification(
          sub.subscription as webpush.PushSubscription,
          JSON.stringify({
            title: req.body.title || "New Notification",
            body: req.body.body || "You have a new notification",
          })
        ).catch(error => {
          console.error(`Failed to send notification to subscription ${sub.id}:`, error);
          return null;
        });
      });

      await Promise.all(notifications);
      res.json({ success: true, sent: subscriptions.length });
    } catch (error) {
      console.error('Failed to send notifications:', error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}