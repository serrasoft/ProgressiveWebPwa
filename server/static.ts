import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupStaticServing(app: express.Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  
  // Serve static files
  app.use(express.static(distPath));
  
  // Serve index.html for all routes (SPA fallback)
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
