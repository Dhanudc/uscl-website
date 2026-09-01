import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import { ensureAdminUser } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import registrationRoutes from "./routes/registrations.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";
import liveRoutes from "./routes/live.js";
import teamsRoutes from "./routes/teams.js";
import sponsorRoutes from "./routes/sponsors.js";
import { backfillProfileImageColumn } from "./utils/backfillProfileImage.js";
import { backfillPaymentStatusColumn } from "./utils/backfillPaymentStatus.js";
import { serveMediaFromDb } from "./utils/mediaStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5000;

function getAllowedOrigins() {
  const fromEnv = [process.env.CLIENT_URL, ...(process.env.CLIENT_URLS || "").split(",")]
    .map((value) => String(value || "").trim().replace(/\/$/, ""))
    .filter(Boolean);

  const local = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ];

  // Production domain (www + apex) + current Vercel frontend
  const production = [
    "https://www.usclt20.com",
    "https://usclt20.com",
    "https://uscl-website-opal.vercel.app",
  ];

  return new Set([...fromEnv, ...local, ...production]);
}

const allowedOrigins = getAllowedOrigins();
const primaryClientUrl = process.env.CLIENT_URL?.trim().replace(/\/$/, "") || "http://localhost:5173";

app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (!isProd) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Prefer Mongo-backed media (survives Render redeploys), then disk fallback
app.get("/profile-images/:filename", serveMediaFromDb("profile"));
app.get("/payments/:filename", serveMediaFromDb("payment"));
app.get("/payment-screenshots/:filename", serveMediaFromDb("payment"));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/profile-images", express.static(path.join(__dirname, "../public/profile-images")));
// Legacy path used when uploads resolved under server/src/public
app.use("/profile-images", express.static(path.join(__dirname, "public/profile-images")));
app.use("/payments", express.static(path.join(__dirname, "../public/payments")));
// Legacy screenshot path
app.use(
  "/payment-screenshots",
  express.static(path.join(__dirname, "../public/payment-screenshots"))
);
app.use(
  "/payment-screenshots",
  express.static(path.join(__dirname, "../public/payments"))
);
app.use("/media/images", express.static(path.join(__dirname, "../public/media/images")));
app.use("/media/videos", express.static(path.join(__dirname, "../public/media/videos")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "uscl-server", env: isProd ? "production" : "development" });
});

app.use("/api/auth", authRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/sponsors", sponsorRoutes);

app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith("CORS blocked")) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

async function start() {
  if (isProd) {
    if (!String(process.env.MONGODB_URI || "").trim()) {
      throw new Error("MONGODB_URI is required in production.");
    }
    if (!String(process.env.JWT_SECRET || "").trim() || process.env.JWT_SECRET === "uscl-dev-secret") {
      throw new Error("Set a strong JWT_SECRET in production.");
    }
    if (!String(process.env.CLIENT_URL || "").trim()) {
      throw new Error("CLIENT_URL is required in production (your Vercel frontend URL).");
    }
  }

  await connectDB();
  await ensureAdminUser();
  await backfillProfileImageColumn();
  await backfillPaymentStatusColumn();
  const razorpayReady = Boolean(
    String(process.env.RAZORPAY_KEY_ID || "").trim() &&
      String(process.env.RAZORPAY_KEY_SECRET || "").trim()
  );
  const cashfreeReady = Boolean(
    String(process.env.CASHFREE_APP_ID || "").trim() &&
      String(process.env.CASHFREE_SECRET_KEY || "").trim()
  );
  app.listen(PORT, () => {
    console.log(`[server] API listening on port ${PORT}`);
    console.log(`[server] CORS allowlist: ${[...allowedOrigins].join(", ")}`);
    console.log(`[server] Primary client: ${primaryClientUrl}`);
    console.log(`[server] Admin: ${process.env.ADMIN_EMAIL || "admin@uscl.com"}`);
    console.log(`[server] Razorpay: ${razorpayReady ? "configured" : "MISSING keys"}`);
    console.log(`[server] Cashfree: ${cashfreeReady ? "configured" : "MISSING keys"}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
