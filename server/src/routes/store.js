import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "coming_soon",
    message: "USCL Store launches soon.",
  });
});

export default router;
