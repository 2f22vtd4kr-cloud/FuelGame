import { Router } from "express";
import { db } from "@workspace/db";
import { dailyLeaderboardTable, usersTable } from "@workspace/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";

// Transaction type extracted from the db instance — avoids importing drizzle internals.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const router = Router();

/**
 * GET /api/leaderboard/daily?date=YYYY-MM-DD
 * Returns the top-20 entries for a given date (defaults to today UTC).
 */
router.get("/leaderboard/daily", async (req, res) => {
  try {
    const date = typeof req.query['date'] === 'string'
      ? req.query['date']
      : new Date().toISOString().slice(0, 10);

    const entries = await db
      .select({
        rank: sql<number>`rank() over (order by ${dailyLeaderboardTable.score} desc)`,
        userId: dailyLeaderboardTable.userId,
        score: dailyLeaderboardTable.score,
        matchesPlayed: dailyLeaderboardTable.matchesPlayed,
        displayName: usersTable.displayName,
        preferredCharacter: usersTable.preferredCharacter,
      })
      .from(dailyLeaderboardTable)
      .innerJoin(usersTable, eq(dailyLeaderboardTable.userId, usersTable.telegramId))
      .where(eq(dailyLeaderboardTable.date, date))
      .orderBy(desc(dailyLeaderboardTable.score))
      .limit(20);

    res.json({ date, entries });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch daily leaderboard" });
  }
});

/**
 * POST /api/leaderboard/daily
 * Atomically increments a player's daily score using a transaction.
 * Body: { userId: number, score: number, matchesPlayed?: number }
 */
router.post("/leaderboard/daily", async (req, res) => {
  try {
    const { userId, score, matchesPlayed = 1 } = req.body as {
      userId?: number;
      score?: number;
      matchesPlayed?: number;
    };

    if (typeof userId !== "number" || typeof score !== "number") {
      return res.status(400).json({ error: "userId (number) and score (number) required" });
    }

    const date = new Date().toISOString().slice(0, 10);
    const safeScore = Math.max(0, score);

    // Atomic upsert inside a serializable transaction to prevent lost increments
    // under concurrent submissions for the same (userId, date).
    const result = await db.transaction(async (tx: Tx) => {
      const existing = await tx
        .select({ score: dailyLeaderboardTable.score, matchesPlayed: dailyLeaderboardTable.matchesPlayed })
        .from(dailyLeaderboardTable)
        .where(
          and(
            eq(dailyLeaderboardTable.userId, userId),
            eq(dailyLeaderboardTable.date, date),
          ),
        )
        .limit(1)
        .for("update"); // row-level lock prevents concurrent insert/update races

      if (existing.length > 0) {
        await tx
          .update(dailyLeaderboardTable)
          .set({
            score: (existing[0].score ?? 0) + safeScore,
            matchesPlayed: (existing[0].matchesPlayed ?? 0) + matchesPlayed,
          })
          .where(
            and(
              eq(dailyLeaderboardTable.userId, userId),
              eq(dailyLeaderboardTable.date, date),
            ),
          );
        return "updated";
      }

      await tx.insert(dailyLeaderboardTable).values({
        date,
        userId,
        score: safeScore,
        matchesPlayed,
      });
      return "inserted";
    });

    return res.json({ success: true, action: result, date });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit daily score" });
  }
});

export default router;
