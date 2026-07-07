import { pgTable, text, integer, boolean, timestamp, uuid, bigint, varchar, jsonb, date, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  username: varchar("username", { length: 64 }),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  babki: integer("babki").default(0).notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  preferredCharacter: varchar("preferred_character", { length: 50 }).default("denis"),
  totalMatches: integer("total_matches").default(0).notNull(),
  totalWins: integer("total_wins").default(0).notNull(),
  fuelLinked: boolean("fuel_linked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, lastSeen: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryTable = pgTable("inventory", {
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.telegramId),
  itemType: varchar("item_type", { length: 50 }).notNull(), // 'skin' | 'hat' | 'pet' | 'car'
  itemId: varchar("item_id", { length: 100 }).notNull(),
  equipped: boolean("equipped").default(false),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventoryTable).omit({ acquiredAt: true });
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventoryTable.$inferSelect;

// ─── Match History ────────────────────────────────────────────────────────────

export const matchHistoryTable = pgTable("match_history", {
  matchId: uuid("match_id").defaultRandom(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.telegramId),
  role: varchar("role", { length: 20 }).notNull(), // 'khozain' | 'slivshchik' | 'neutral' | 'cat'
  result: varchar("result", { length: 20 }).notNull(), // 'win' | 'lose' | 'draw'
  fuelSiphoned: integer("fuel_siphoned").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  survivedSeconds: integer("survived_seconds"),
  character: varchar("character", { length: 50 }),
  playedAt: timestamp("played_at").defaultNow(),
}, (t) => [
  index("match_history_user_played_idx").on(t.userId, t.playedAt),
]);

export const insertMatchHistorySchema = createInsertSchema(matchHistoryTable).omit({ matchId: true, playedAt: true });
export type InsertMatchHistory = z.infer<typeof insertMatchHistorySchema>;
export type MatchHistory = typeof matchHistoryTable.$inferSelect;

// ─── Daily Leaderboard ────────────────────────────────────────────────────────

export const dailyLeaderboardTable = pgTable("daily_leaderboard", {
  date: date("date").notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.telegramId),
  score: integer("score").notNull(),
  matchesPlayed: integer("matches_played").default(0),
});

export const insertDailyLeaderboardSchema = createInsertSchema(dailyLeaderboardTable);
export type InsertDailyLeaderboard = z.infer<typeof insertDailyLeaderboardSchema>;
export type DailyLeaderboard = typeof dailyLeaderboardTable.$inferSelect;

// ─── Achievements ─────────────────────────────────────────────────────────────

export const achievementsTable = pgTable("achievements", {
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => usersTable.telegramId),
  achievementId: varchar("achievement_id", { length: 100 }).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const insertAchievementSchema = createInsertSchema(achievementsTable).omit({ unlockedAt: true });
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievementsTable.$inferSelect;

// ─── Rooms (for post-match analytics) ────────────────────────────────────────

export const roomsTable = pgTable("rooms", {
  roomCode: varchar("room_code", { length: 10 }).primaryKey(),
  hostId: bigint("host_id", { mode: "number" }).references(() => usersTable.telegramId),
  createdAt: timestamp("created_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("lobby"), // lobby | playing | finished
  maxPlayers: integer("max_players").default(8),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ createdAt: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;

// ─── Room Events ──────────────────────────────────────────────────────────────

export const roomEventsTable = pgTable("room_events", {
  id: serial("id").primaryKey(),
  roomCode: varchar("room_code", { length: 10 }),
  eventType: varchar("event_type", { length: 50 }),
  eventData: jsonb("event_data"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertRoomEventSchema = createInsertSchema(roomEventsTable).omit({ id: true, timestamp: true });
export type InsertRoomEvent = z.infer<typeof insertRoomEventSchema>;
export type RoomEvent = typeof roomEventsTable.$inferSelect;
