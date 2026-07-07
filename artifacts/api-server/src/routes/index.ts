import { Router, type IRouter } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);

// Leaderboard routes require a database — only mount them when DATABASE_URL is available
if (process.env.DATABASE_URL) {
  // Dynamic import so the module (and its `db` initializer) is never evaluated
  // in environments without a database, keeping the WS game server functional.
  import("./leaderboard").then(({ default: leaderboardRouter }) => {
    router.use(leaderboardRouter);
  });
}

export default router;
