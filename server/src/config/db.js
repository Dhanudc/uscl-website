import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let memoryServer;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  let uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MONGODB_URI is required in production (use MongoDB Atlas).");
    }
    const dbPath = path.join(process.cwd(), ".data", "mongo");
    fs.mkdirSync(dbPath, { recursive: true });
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: "uscl", dbPath, storageEngine: "wiredTiger" },
    });
    uri = memoryServer.getUri("uscl");
    console.log(`[db] Using local persistent MongoDB at ${dbPath}`);
  } else {
    console.log("[db] Using MONGODB_URI");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  return mongoose.connection;
}
