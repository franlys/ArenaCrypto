/**
 * POST /api/games/dragon-tower
 * Dual Auth: cookie-based (SSR) + Bearer token (fallback)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAnon } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser(req: NextRequest) {
  const supabase = await createAnon();
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) return cookieUser;

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token && token !== "undefined" && token !== "null") {
    const { data: { user: headerUser } } = await supabase.auth.getUser(token);
    return headerUser;
  }
  return null;
}

const DIFFICULTY_CONFIG = {
  easy:   { tiles: 4 },
  medium: { tiles: 3 },
  hard:   { tiles: 2 },
  expert: { tiles: 4 }, // Expert: 3 mines, 1 safe (25% chance)
};

const LEVEL_MULTIPLIERS: Record<string, number[]> = {
  easy:   [1.23, 1.51, 1.85, 2.27, 2.79, 3.42, 4.20, 5.16, 6.34],
  medium: [1.38, 1.90, 2.62, 3.62, 5.00, 6.90, 9.52, 13.14, 18.13],
  hard:   [1.84, 3.38, 6.22, 11.45, 21.06, 38.75, 71.30, 131.2, 241.4],
  expert: [3.68, 13.54, 49.83, 183.3, 674.5, 2482, 9134, 33613, 123700],
};

const MAX_LEVELS = 9;

function isLevelSafe(serverSeed: string, level: number, tile: number, difficulty: string): boolean {
  const cfg = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
  const hash = crypto.createHash("sha256").update(`${serverSeed}-${level}`).digest("hex");
  const minePosition = parseInt(hash.slice(0, 2), 16) % cfg.tiles;
  return tile !== minePosition;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Sesión expirada o no autenticado. Por favor, recarga la página o conecta tu wallet." }, { status: 401 });

  const body = await req.json();
  const { action, isTest = false } = body;
  const db = admin();
  const field = isTest ? "test_balance" : "balance_stablecoin";

  if (action === "start") {
    const { amount, difficulty = "medium" } = body;
    if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

    const { data: active } = await db.from("dragon_tower_games")
      .select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (active) return NextResponse.json({ error: "Ya tienes una partida activa" }, { status: 400 });

    const { data: wallet } = await db.from("wallets")
      .select("balance_stablecoin, test_balance").eq("user_id", user.id).single();
    if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

    const bal = Number((wallet as Record<string, unknown>)[field]);
    if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

    await db.from("wallets").update({ [field]: bal - amount }).eq("user_id", user.id);

    const serverSeed = crypto.randomBytes(32).toString("hex");
    const { data: game } = await db.from("dragon_tower_games").insert({
      user_id: user.id, amount, is_test: isTest,
      difficulty, server_seed: serverSeed,
      current_level: 0, current_multiplier: 1.0, path: [],
    }).select().single();

    return NextResponse.json({
      ok: true, game_id: game.id, difficulty,
      tiles_per_row: DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG].tiles,
      multipliers: LEVEL_MULTIPLIERS[difficulty],
    });
  }

  if (action === "step") {
    const { game_id, tile_index } = body;
    const { data: game } = await db.from("dragon_tower_games")
      .select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active") return NextResponse.json({ error: "Partida no activa" }, { status: 400 });

    const nextLevel = game.current_level + 1;
    const safe = isLevelSafe(game.server_seed, nextLevel, tile_index, game.difficulty);

    if (!safe) {
      const cfg = DIFFICULTY_CONFIG[game.difficulty as keyof typeof DIFFICULTY_CONFIG];
      const hash = crypto.createHash("sha256").update(`${game.server_seed}-${nextLevel}`).digest("hex");
      const mineTile = parseInt(hash.slice(0, 2), 16) % cfg.tiles;
      await db.from("dragon_tower_games").update({
        status: "dead", payout: 0, path: [...(game.path ?? []), tile_index],
        finished_at: new Date().toISOString(),
      }).eq("id", game_id);
      return NextResponse.json({ ok: true, survived: false, mine_was_at: mineTile, payout: 0 });
    }

    const multipliers = LEVEL_MULTIPLIERS[game.difficulty];
    const newMult = multipliers[nextLevel - 1] ?? game.current_multiplier;
    const newPath = [...(game.path ?? []), tile_index];

    await db.from("dragon_tower_games").update({
      current_level: nextLevel, current_multiplier: newMult, path: newPath,
    }).eq("id", game_id);

    if (nextLevel >= MAX_LEVELS) {
      const payout = Number((game.amount * newMult).toFixed(2));
      const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
      await db.from("wallets").update({ [field]: (w as any)[field] + payout }).eq("user_id", user.id);
      await db.from("dragon_tower_games").update({
        status: "cashed_out", payout, finished_at: new Date().toISOString(),
      }).eq("id", game_id);
      return NextResponse.json({ ok: true, survived: true, level: nextLevel, multiplier: newMult, auto_cashout: true, payout });
    }

    return NextResponse.json({ ok: true, survived: true, level: nextLevel, multiplier: newMult });
  }

  if (action === "cashout") {
    const { game_id } = body;
    const { data: game } = await db.from("dragon_tower_games")
      .select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active" || game.current_level === 0)
      return NextResponse.json({ error: "Nada que cobrar" }, { status: 400 });

    const payout = Number((game.amount * game.current_multiplier).toFixed(2));
    const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    await db.from("wallets").update({ [field]: (w as any)[field] + payout }).eq("user_id", user.id);
    await db.from("dragon_tower_games").update({
      status: "cashed_out", payout, finished_at: new Date().toISOString(),
    }).eq("id", game_id);

    return NextResponse.json({ ok: true, payout, multiplier: game.current_multiplier });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
