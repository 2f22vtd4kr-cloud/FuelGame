import { Router } from "express";
import { db } from "@workspace/db";
import { leaderboardEntriesTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (_req, res) => {
  try {
    const entries = await db
      .select()
      .from(leaderboardEntriesTable)
      .orderBy(desc(leaderboardEntriesTable.babki))
      .limit(20);
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.post("/leaderboard", async (req, res) => {
  try {
    const { playerName, character, babki, wins, matches, deviceId } = req.body as {
      playerName?: string;
      character?: string;
      babki?: number;
      wins?: number;
      matches?: number;
      deviceId?: string;
    };

    if (!playerName || typeof babki !== "number") {
      return res.status(400).json({ error: "playerName and babki required" });
    }

    if (deviceId) {
      const existing = await db
        .select({ id: leaderboardEntriesTable.id })
        .from(leaderboardEntriesTable)
        .where(eq(leaderboardEntriesTable.deviceId, deviceId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(leaderboardEntriesTable)
          .set({
            playerName,
            character: character ?? "denis",
            babki: Math.max(0, babki),
            wins: wins ?? 0,
            matches: matches ?? 0,
          })
          .where(eq(leaderboardEntriesTable.deviceId, deviceId));
        return res.json({ success: true, action: "updated" });
      }
    }

    await db.insert(leaderboardEntriesTable).values({
      playerName,
      character: character ?? "denis",
      babki: Math.max(0, babki),
      wins: wins ?? 0,
      matches: matches ?? 0,
      deviceId: deviceId ?? null,
    });

    return res.json({ success: true, action: "inserted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit score" });
  }
});

export default router;
