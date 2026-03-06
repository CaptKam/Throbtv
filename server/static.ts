import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Vite hashed assets (js/css) — cache for 1 year (immutable)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Other static files — cache for 1 hour
  app.use(express.static(distPath, {
    maxAge: "1h",
  }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    fs.readFile(indexPath, "utf-8", (err, data) => {
      if (err) {
        return res.sendStatus(404);
      }
      const html = data.replace('nonce="${nonce}"', `nonce="${res.locals.nonce}"`);
      res.send(html);
    });
  });
}
