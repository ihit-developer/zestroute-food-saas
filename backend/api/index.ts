import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';

const app = createApp();
let dbReady: Promise<typeof mongoose> | null = null;

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!dbReady) {
    dbReady = connectDatabase().catch((err) => {
      dbReady = null;
      throw err;
    });
  }
  await dbReady;
}

export default async function handler(req: Request, res: Response) {
  await ensureDb();
  return app(req, res);
}
