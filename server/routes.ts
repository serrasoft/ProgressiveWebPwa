import type { Express } from "express";
import { createServer, type Server } from "http";
import webpush from "web-push";
import { 
  insertPushSubscriptionSchema, 
  registerUserSchema, 
  verifyUserSchema,
  loginUserSchema,
  validatedRegisterUserSchema
} from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { ZodError } from "zod";
import session from "express-session";
import { SessionData } from "express-session";

// Extend the session interface to include our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    email?: string;
  }
}
import { sendVerificationCode } from "./email";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Password utility functions
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(provided: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split('.');
  const keyBuffer = Buffer.from(hashedPassword, 'hex');
  const derivedKey = (await scryptAsync(provided, salt, 64)) as Buffer;
  return timingSafeEqual(keyBuffer, derivedKey);
}

// Generate a random 4-digit verification code
function generateVerificationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Middleware to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Set trust proxy for deployed environment
  app.set('trust proxy', 1);

  // Setup session middleware with secure settings
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.use(session({
    secret: 'brf-docenten-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // Only use secure cookies in production
      sameSite: isProduction ? 'none' : 'lax', // Cross-domain in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true
    }
  }));

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      // Validate registration data
      let registrationData;
      try {
        registrationData = validatedRegisterUserSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Ogiltiga registreringsuppgifter",
            errors: error.errors
          });
        }
        throw error;
      }

      const { email, password } = registrationData;

      // Check if user already exists
      const existingUser = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email));

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "E-postadressen är redan registrerad" });
      }

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const verificationExpiry = new Date();
      verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 30); // Code valid for 30 minutes

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create new user
      const [user] = await db.insert(schema.users)
        .values({
          email,
          password: hashedPassword,
          verificationCode,
          verificationExpiry,
          verified: false,
          offlineData: JSON.stringify({}) // Fix for the spread types error
        })
        .returning();

      // Send verification email
      const emailSent = await sendVerificationCode({
        to: email,
        code: verificationCode
      });

      if (!emailSent) {
        console.error(`Failed to send verification email to ${email}`);
        // Continue anyway since we want to let user verify later with the code
        // We'll log the code in development for convenience
        console.log(`Verification code for ${email}: ${verificationCode}`);
      }

      // Store email in session for verification
      req.session.email = email;
      
      res.status(201).json({ 
        success: true,
        message: "Registrering klar. Kontrollera din e-post för verifieringskod."
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Kunde inte skapa konto" });
    }
  });

  // Verify email with code
  app.post("/api/verify", async (req, res) => {
    try {
      // Validate verification data
      let verificationData;
      try {
        verificationData = verifyUserSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Ogiltig verifieringskod",
            errors: error.errors
          });
        }
        throw error;
      }

      const { email, code } = verificationData;

      // Find the user
      const [user] = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email));

      if (!user) {
        return res.status(400).json({ message: "Användaren finns inte" });
      }

      // Check if already verified
      if (user.verified) {
        req.session.userId = user.id;
        return res.json({ 
          success: true,
          message: "Konto redan verifierat" 
        });
      }

      // Check verification code
      if (!user.verificationCode || user.verificationCode !== code) {
        return res.status(400).json({ message: "Ogiltig verifieringskod" });
      }

      // Check if code has expired
      if (user.verificationExpiry && new Date() > new Date(user.verificationExpiry)) {
        return res.status(400).json({ message: "Verifieringskoden har gått ut" });
      }

      // Mark as verified
      const [updatedUser] = await db.update(schema.users)
        .set({
          verified: true,
          verificationCode: null,
          verificationExpiry: null
        })
        .where(eq(schema.users.id, user.id))
        .returning();

      // Log the user in
      req.session.userId = updatedUser.id;
      
      res.json({ 
        success: true,
        message: "E-postadressen har verifierats" 
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ message: "Kunde inte verifiera konto" });
    }
  });

  // Resend verification code
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "E-postadress krävs" });
      }

      // Find the user
      const [user] = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email));

      if (!user) {
        return res.status(400).json({ message: "Användaren finns inte" });
      }

      // Check if already verified
      if (user.verified) {
        return res.json({ 
          success: true,
          message: "Konto redan verifierat" 
        });
      }

      // Generate new verification code
      const verificationCode = generateVerificationCode();
      const verificationExpiry = new Date();
      verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 30); // Code valid for 30 minutes

      // Update user with new verification code
      await db.update(schema.users)
        .set({
          verificationCode,
          verificationExpiry
        })
        .where(eq(schema.users.id, user.id));

      // Send verification email
      const emailSent = await sendVerificationCode({
        to: email,
        code: verificationCode
      });

      if (!emailSent) {
        console.error(`Failed to send verification email to ${email}`);
        console.log(`Verification code for ${email}: ${verificationCode}`);
        return res.json({ 
          success: true,
          message: "Verifieringskod genererad, men kunde inte skickas via e-post. Kontrollera konsolen för koden."
        });
      }

      res.json({ 
        success: true,
        message: "Ny verifieringskod har skickats" 
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: "Kunde inte skicka ny verifieringskod" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      // Validate login data
      let loginData;
      try {
        loginData = loginUserSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            message: "Ogiltiga inloggningsuppgifter",
            errors: error.errors
          });
        }
        throw error;
      }

      const { email, password } = loginData;

      // Find the user
      const [user] = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email));

      if (!user) {
        return res.status(401).json({ message: "Fel e-postadress eller lösenord" });
      }

      // Check if account is verified
      if (!user.verified) {
        // Store email in session for verification
        req.session.email = email;
        return res.status(400).json({ 
          message: "Kontot är inte verifierat",
          needsVerification: true,
          email: email // Send email back to client for verification form
        });
      }

      // Verify password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Fel e-postadress eller lösenord" });
      }

      // Log the user in
      req.session.userId = user.id;
      
      res.json({ success: true });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Kunde inte logga in" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: "Kunde inte logga ut" });
      }
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

      // Parse existing offlineData
      let offlineDataObj = {};
      if (user.offlineData) {
        try {
          if (typeof user.offlineData === 'string') {
            offlineDataObj = JSON.parse(user.offlineData);
          } else if (typeof user.offlineData === 'object') {
            offlineDataObj = { ...user.offlineData as object };
          }
        } catch (e) {
          console.error('Failed to parse offlineData:', e);
        }
      }

      // Create updated offlineData
      const updatedOfflineData = JSON.stringify({
        ...offlineDataObj,
        displayName: req.body.displayName,
        apartmentNumber: req.body.apartmentNumber,
        port: req.body.port,
        phoneNumber: req.body.phoneNumber,
        lastUpdated: new Date().toISOString(),
      });

      const [updatedUser] = await db.update(schema.users)
        .set({
          displayName: req.body.displayName,
          apartmentNumber: req.body.apartmentNumber,
          port: req.body.port,
          phoneNumber: req.body.phoneNumber,
          offlineData: updatedOfflineData,
        })
        .where(eq(schema.users.id, req.session.userId!))
        .returning();

      res.json({
        email: updatedUser.email,
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
  
  // Delete user account and all associated data
  app.delete("/api/account", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Delete all push subscriptions for this user
      await db.delete(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, userId));
      
      // Delete the user
      await db.delete(schema.users)
        .where(eq(schema.users.id, userId));
      
      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({ message: "Kontot har raderats men det gick inte att logga ut" });
        }
        
        res.json({ success: true, message: "Konto och alla uppgifter har raderats" });
      });
    } catch (error) {
      console.error('Failed to delete account:', error);
      res.status(500).json({ error: "Det gick inte att radera kontot" });
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
  
  // Print confirmation of VAPID keys setup
  console.log('VAPID keys setup with public key starting with:', 
    process.env.VAPID_PUBLIC_KEY?.substring(0, 10) + '...');

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
          body: req.body.body, // Store the message body
          link: req.body.link,
          createdAt: new Date(),
        })
        .returning();

      console.log('Created notification:', notification);

      // In the payload, add the body field as a separate field since it's not stored in the database
      // Creating a more iOS-friendly payload structure
      const payload = JSON.stringify({
        title: req.body.title,
        body: req.body.body || 'Nytt meddelande från Bergakungen',
        url: '/', // Default URL (app home)
        link: req.body.link || null, // Include the link if it exists for external navigation
        id: notification.id,
        // Additional fields for iOS compatibility
        aps: {
          alert: {
            title: req.body.title,
            body: req.body.body || 'Nytt meddelande från Bergakungen'
          },
          'content-available': 1,
          // Simplified badge handling for iOS
          badge: 1
        }
      });
      console.log('Sending notification payload:', payload);

      // Enhanced diagnostic logging to troubleshoot Web Push issues
      console.log('==== Starting Web Push notification delivery ==== ');
      console.log('Payload size:', payload.length, 'bytes');
      
      if (payload.length > 4096) {
        console.warn('WARNING: Payload exceeds 4KB which may cause issues with some browsers');
      }
      
      // Type definition for a push subscription
      interface PushSubscriptionData {
        endpoint?: string;
        keys?: {
          auth?: string;
          p256dh?: string;
        };
        expirationTime?: number | null;
      }
      
      // Log the first 5 subscriptions for detailed diagnostic information
      const subscriptionsToLog = subscriptions.slice(0, 5);
      subscriptionsToLog.forEach((sub, index) => {
        let subscriptionObj: PushSubscriptionData = {};
        
        try {
          if (typeof sub.subscription === 'string') {
            subscriptionObj = JSON.parse(sub.subscription) as PushSubscriptionData;
          } else {
            subscriptionObj = sub.subscription as PushSubscriptionData;
          }
        } catch (e) {
          console.error('Failed to parse subscription for logging:', e);
        }
        
        console.log(`Subscription ${index+1} details:`, {
          id: sub.id,
          endpoint: subscriptionObj?.endpoint 
            ? subscriptionObj.endpoint.substring(0, 50) + '...' 
            : 'missing endpoint',
          userId: sub.userId,
          // PushSubscription doesn't have createdAt in our schema
          created: 'unknown',
          hasKeys: subscriptionObj?.keys ? 'yes' : 'no'
        });
      });
      
      const notifications = subscriptions.map(sub => {
        console.log(`Sending notification to subscription ${sub.id} for user ${sub.userId}`);
        
        try {
          // Parse subscription if it's a string
          let subscriptionObj = {} as webpush.PushSubscription;
          
          if (typeof sub.subscription === 'string') {
            try {
              subscriptionObj = JSON.parse(sub.subscription) as webpush.PushSubscription;
            } catch (e) {
              console.error(`Failed to parse subscription string for ID ${sub.id}:`, e);
              return Promise.resolve(null);
            }
          } else {
            subscriptionObj = sub.subscription as webpush.PushSubscription;
          }
          
          // Validate subscription format before sending
          if (!subscriptionObj || !subscriptionObj.endpoint) {
            console.error(`Invalid subscription format for ID ${sub.id}:`, subscriptionObj);
            return Promise.resolve(null);
          }
          
          // Define special options for push notification delivery with proper type definition
          const pushOptions: webpush.RequestOptions = {
            // Use a TTL of 24 hours for the notification
            TTL: 86400,
            // Set urgency to high for better iOS delivery
            urgency: 'high' as webpush.Urgency,
            // Add topic for better notification grouping
            topic: 'bergakungen-notification'
          };
          
          // Enhanced iOS-friendly push notification sending
          return webpush.sendNotification(
            subscriptionObj,
            payload,
            pushOptions
          ).then(result => {
            console.log(`Successfully sent notification to subscription ${sub.id}:`, {
              statusCode: result?.statusCode,
              endpoint: subscriptionObj.endpoint?.substring(0, 30) + '...'
            });
            return result;
          }).catch(error => {
            console.error(`Failed to send notification to subscription ${sub.id}:`, {
              statusCode: error?.statusCode,
              message: error?.message,
              body: error?.body?.substring(0, 100)
            });
            
            if (error.statusCode === 410) {
              // Subscription has expired or is invalid
              console.log(`Subscription ${sub.id} is no longer valid - should be removed`);
              // TODO: Add code to remove invalid subscriptions
            } else if (error.statusCode === 404) {
              console.error('Endpoint not found - subscription may have been unregistered');
            } else if (error.statusCode === 400) {
              console.error('Invalid request - check subscription format and payload');
            } else if (error.statusCode === 401) {
              console.error('Unauthorized - VAPID keys may be invalid');
            } else if (error.statusCode === 429) {
              console.error('Too many requests - rate limited by push service');
            } else if (error.statusCode >= 500) {
              console.error('Server error from push service');
            }
            
            return null;
          });
        } catch (unexpectedError) {
          console.error('Unexpected error preparing notification:', unexpectedError);
          return Promise.resolve(null);
        }
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