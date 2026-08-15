import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
  // eslint-disable-next-line no-var
  var mongoMemory: MongoMemoryServer | undefined;
  // eslint-disable-next-line no-var
  var adminSeeded: boolean | undefined;
}

const cached = global.mongooseConn ?? { conn: null, promise: null };
global.mongooseConn = cached;

async function resolveUri(): Promise<string> {
  const envUri = process.env.MONGODB_URI?.trim();
  if (envUri) {
    return envUri;
  }

  if (!global.mongoMemory) {
    const dbPath = path.join(process.cwd(), ".data", "mongo");
    fs.mkdirSync(dbPath, { recursive: true });

    global.mongoMemory = await MongoMemoryServer.create({
      instance: {
        dbName: "uscl",
        dbPath,
        storageEngine: "wiredTiger",
      },
    });

    console.warn(
      `[db] No MONGODB_URI set — using persistent local MongoDB at ${dbPath}`
    );
  }

  return global.mongoMemory.getUri("uscl");
}

export async function connectDB() {
  if (cached.conn) {
    // Reconnect if the connection dropped after a hot reload
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      const uri = await resolveUri();
      mongoose.set("bufferCommands", false);
      return mongoose.connect(uri);
    })().catch((err) => {
      cached.promise = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;

  if (!global.adminSeeded) {
    try {
      const { ensureAdminUser } = await import("@/lib/auth");
      await ensureAdminUser();
      global.adminSeeded = true;
    } catch (err) {
      console.error("[db] Failed to ensure admin user", err);
    }
  }

  return cached.conn;
}
