import { Router, type IRouter } from "express";
import healthRouter from "./health";
import starsRouter from "./stars";

const router: IRouter = Router();

router.use(healthRouter);
// §10.3 Telegram Stars invoice creation (always mounted; returns 503 when BOT_TOKEN absent)
router.use(starsRouter);

// Leaderboard routes require a database — only mount them when DATABASE_URL is available
if (process.env.DATABASE_URL) {
  // Dynamic import so the module (and its `db` initializer) is never evaluated
  // in environments without a database, keeping the WS game server functional.
  import("./leaderboard").then(({ default: leaderboardRouter }) => {
    router.use(leaderboardRouter);
  });
}

export default router;
