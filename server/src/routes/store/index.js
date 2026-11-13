import { Router } from "express";
import publicRoutes from "./public.js";
import customerRoutes from "./customer.js";
import adminRoutes from "./admin.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, module: "uscl-store", version: 1 });
});

router.use("/", publicRoutes);
router.use("/customer", customerRoutes);
router.use("/admin", adminRoutes);

export default router;
