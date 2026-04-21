/**
 * POST /api/games/dragon-tower
 * Actions: start | step | cashout
 * Multi-level game — each level: choose a tile, if wrong → dead
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Difficulty → { tiles per row, safe tiles per row }
const DIFFICULTY_CONFIG = {
  easy:   { tiles: 4, safe: 3 },  // 1 mine in 4
  medium: { tiles: 3, safe: 2 },  // 1 mine in 3
  hard:   { tiles: 2, safe: 1 },  // 1 mine in 2
  expert: { tiles: 2, safe: 0.5 }, // almost always wrong
};

// Multiplier per level (cumulative, 3% house edge applied)
const LEVEL_MULTIPLIERS: Record<string, number[]> = {
  easy:   [1.20, 1.44, 1.73, 2.07, 2.49, 2.98, 3.58, 4.30, 5.16],
  medium: [1.40, 1.96, 2.75, 3.85, 5.39, 7.55, 10.57, 14.80, 20.72],
  hard:   [1.88, 3.52, 6.64, 12.49, 23.49, 44.14, 83.00, 156.0, 293.0],
  expert: [3.60, 12.96, 46.66, 168.0, 604.0, 0, 0, 0, 0],
};

function isLevelSafe(serverSeed: string, level: number, tile: number, difficulty: string): boolean {
  const config = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
  const hash = crypto.createHash("sha256").update(`${serverSeed}-${level}`).digest("hex");
  // Mine position = hash byte mod tiles
  const minePosition = parseInt(hash.slice(0, 2), 16) % config.tiles;
  return tile !== minePosition;
}

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await db().auth.getUser(token);
  return data?.user ?? null;
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "start") {
    const { amount, difficulty = "medium" } = body;
    if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    if (!DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG])
      return NextResponse.json({ error: "Dificultad inválida" }, { status: 400 });

    // Check no active game
    const { data: active } = await db().from("dragon_tower_games")
      .select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (active) return NextResponse.json({ error: "Ya tienes una partida activa" }, { status: 400 });

    // Deduct balance
    const { data: wallet } = await db().from("wallets")
      .select("balance_stablecoin, test_balance, is_test_user").eq("user_id", user.id).single();
    if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

    const isTest = wallet.is_test_user ?? false;
    const bal = isTest ? wallet.test_balance : wallet.balance_stablecoin;
    if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

    const col = isTest ? "test_balance" : "balance_stablecoin";
    await db().from("wallets").update({ [col]: bal - amount }).eq("user_id", user.id);

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const { data: game } = await db().from("dragon_tower_games").insert({
      user_id: user.id, amount, is_test: isTest,
      difficulty, server_seed: serverSeed,
      current_level: 0, current_multiplier: 1.0,
    }).select().single();

    const config = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
    return NextResponse.json({
      ok: true, game_id: game.id, difficulty,
      tiles_per_row: config.tiles,
      multipliers: LEVEL_MULTIPLIERS[difficulty],
    });
  }

  if (action === "step") {
    const { game_id, tile_index } = body;
    const { data: game } = await db().from("dragon_tower_games")
      .select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active")
      return NextResponse.json({ error: "Partida no activa" }, { status: 400 });
    if (game.current_level >= game.max_levels)
      return NextResponse.json({ error: "Ya llegaste al tope" }, { status: 400 });

    const nextLevel = game.current_level + 1;
    const safe = isLevelSafe(game.server_seed, nextLevel, tile_index, game.difficulty);

    if (!safe) {
      await db().from("dragon_tower_games").update({
        status: "dead", payout: 0, path: [...game.path, tile_index],
        finished_at: new Date().toISOString(),
      }).eq("id", game_id);
      // Reveal the safe tile at this level
      const config = DIFFICULTY_CONFIG[game.difficulty as keyof typeof DIFFICULTY_CONFIG];
      const hash = crypto.createHash("sha256").update(`${game.server_seed}-${nextLevel}`).digest("hex");
      const mineTile = parseInt(hash.slice(0, 2), 16) % config.tiles;
      return NextResponse.json({ ok: true, survived: false, mine_was_at: mineTile, payout: 0 });
    }

    const multipliers = LEVEL_MULTIPLIERS[game.difficulty];
    const newMult = multipliers[nextLevel - 1] ?? game.current_multiplier;
    const newPath = [...game.path, tile_index];

    await db().from("dragon_tower_games").update({
      current_level: nextLevel,
      current_multiplier: newMult,
      path: newPath,
    }).eq("id", game_id);

    const isMaxLevel = nextLevel >= game.max_levels;
    if (isMaxLevel) {
      // Auto cashout at top
      const payout = Number((game.amount * newMult).toFixed(2));
      const col = game.is_test ? "test_balance" : "balance_stablecoin";
      const { data: w } = await db().from("wallets").select(col).eq("user_id", user.id).single();
      await db().from("wallets").update({ [col]: (w as any)[col] + payout }).eq("user_id", user.id);
      await db().from("dragon_tower_games").update({
        status: "cashed_out", payout, finished_at: new Date().toISOString(),
      }).eq("id", game_id);
      return NextResponse.json({ ok: true, survived: true, level: nextLevel, multiplier: newMult, auto_cashout: true, payout });
    }

    return NextResponse.json({ ok: true, survived: true, level: nextLevel, multiplier: newMult });
  }

  if (action === "cashout") {
    const { game_id } = body;
    const { data: game } = await db().from("dragon_tower_games")
      .select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active" || game.current_level === 0)
      return NextResponse.json({ error: "Nada que cobrar" }, { status: 400 });

    const payout = Number((game.amount * game.current_multiplier).toFixed(2));
    const col = game.is_test ? "test_balance" : "balance_stablecoin";
    const { data: w } = await db().from("wallets").select(col).eq("user_id", user.id).single();
    await db().from("wallets").update({ [col]: (w as any)[col] + payout }).eq("user_id", user.id);
    await db().from("dragon_tower_games").update({
      status: "cashed_out", payout, finished_at: new Date().toISOString(),
    }).eq("id", game_id);

    return NextResponse.json({ ok: true, payout, multiplier: game.current_multiplier });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
