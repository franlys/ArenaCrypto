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
  easy:   { tiles: 4, mines: 1 }, 
  medium: { tiles: 3, mines: 1 }, 
  hard:   { tiles: 2, mines: 1 }, 
  expert: { tiles: 3, mines: 2 }, 
  master: { tiles: 4, mines: 3 }, 
};

const LEVEL_MULTIPLIERS: Record<string, number[]> = {
  // prob = 3/4 per level. mult = 0.97 / (0.75^level)
  easy:   [1.29, 1.72, 2.30, 3.06, 4.09, 5.45, 7.27, 9.69, 12.92],
  // prob = 2/3 per level. mult = 0.97 / (0.66^level)
  medium: [1.45, 2.18, 3.27, 4.91, 7.37, 11.05, 16.58, 24.87, 37.31],
  // prob = 1/2 per level. mult = 0.97 / (0.5^level)
  hard:   [1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64],
  // prob = 1/3 per level. mult = 0.97 / (0.33^level)
  expert: [2.91, 8.73, 26.19, 78.57, 235.71, 707.13, 2121.39, 6364.17, 19092.51],
  // prob = 1/4 per level. mult = 0.97 / (0.25^level)
  master: [3.88, 15.52, 62.08, 248.32, 993.28, 3973.12, 15892.48, 63569.92, 254279.68],
};

const MAX_LEVELS = 9;
const MAX_PAYOUT = 25000;
const MAX_BET = 1000;

function getLevelSafeTiles(serverSeed: string, level: number, difficulty: string): number[] {
  const cfg = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG];
  const hash = crypto.createHash("sha256").update(`${serverSeed}-${level}`).digest("hex");
  const pos = parseInt(hash.slice(0, 2), 16) % cfg.tiles;
  
  if (cfg.mines === 1) {
    return Array.from({ length: cfg.tiles }, (_, i) => i).filter(i => i !== pos);
  } else {
    return [pos];
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  let { action, isTest = false } = body;
  const db = admin();

  // Move profile check to 'start' action only to save latency on 'step'/'cashout'

  if (action === "get-active") {
    const { data: active } = await db.from("dragon_tower_games")
      .select("*").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!active) return NextResponse.json({ active: false });
    return NextResponse.json({
      active: true,
      game_id: active.id,
      difficulty: active.difficulty,
      current_level: active.current_level,
      current_multiplier: active.current_multiplier,
      path: active.path,
      amount: active.amount,
      is_test: active.is_test,
      tiles_per_row: DIFFICULTY_CONFIG[active.difficulty as keyof typeof DIFFICULTY_CONFIG].tiles,
      multipliers: LEVEL_MULTIPLIERS[active.difficulty],
    });
  }

  if (action === "start") {
    const { amount, difficulty = "medium" } = body;
    if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    // Enforce hard limit for everyone
    if (amount > MAX_BET) return NextResponse.json({ error: `Apuesta máxima permitida: $${MAX_BET}` }, { status: 400 });

    // SECURITY: Force test mode for test users
    const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
    if (profile?.is_test_user) {
      isTest = true;
    }
    const field = isTest ? "test_balance" : "balance_stablecoin";

    const [activeRes, walletRes] = await Promise.all([
      db.from("dragon_tower_games").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      db.from("wallets").select(field).eq("user_id", user.id).single()
    ]);

    if (activeRes.data) return NextResponse.json({ error: "Ya tienes una partida activa" }, { status: 400 });
    if (!walletRes.data) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

    const bal = Number((walletRes.data as Record<string, unknown>)[field]);
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

    const field = game.is_test ? "test_balance" : "balance_stablecoin";

    const nextLevel = game.current_level + 1;
    const safeTiles = getLevelSafeTiles(game.server_seed, nextLevel, game.difficulty);
    const survived = safeTiles.includes(tile_index);

    if (!survived) {
      await db.from("dragon_tower_games").update({
        status: "dead", payout: 0, path: [...(game.path ?? []), tile_index],
        finished_at: new Date().toISOString(),
      }).eq("id", game_id);
      return NextResponse.json({ ok: true, survived: false, safe_tiles: safeTiles, payout: 0 });
    }

    const multipliers = LEVEL_MULTIPLIERS[game.difficulty];
    const newMult = multipliers[nextLevel - 1] ?? game.current_multiplier;
    const newPath = [...(game.path ?? []), tile_index];

    await db.from("dragon_tower_games").update({
      current_level: nextLevel, current_multiplier: newMult, path: newPath,
    }).eq("id", game_id);

    if (nextLevel >= MAX_LEVELS) {
      const payoutRaw = Number((game.amount * multipliers[nextLevel - 1]).toFixed(2));
      const payout = Math.min(payoutRaw, MAX_PAYOUT);
      const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
      await db.from("wallets").update({ [field]: Number((w as any)[field]) + payout }).eq("user_id", user.id);
      await db.from("dragon_tower_games").update({
        status: "cashed_out", payout, finished_at: new Date().toISOString(),
      }).eq("id", game_id);
      return NextResponse.json({ ok: true, survived: true, level: nextLevel, multiplier: multipliers[nextLevel - 1], auto_cashout: true, payout });
    }

    return NextResponse.json({ ok: true, survived: true, level: nextLevel, multiplier: newMult });
  }

  if (action === "cashout") {
    const { game_id } = body;
    const { data: game } = await db.from("dragon_tower_games")
      .select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active" || game.current_level === 0)
      return NextResponse.json({ error: "Nada que cobrar" }, { status: 400 });

    const field = game.is_test ? "test_balance" : "balance_stablecoin";

    const payoutRaw = Number((game.amount * game.current_multiplier).toFixed(2));
    const payout = Math.min(payoutRaw, MAX_PAYOUT);
    const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    await db.from("wallets").update({ [field]: Number((w as any)[field]) + payout }).eq("user_id", user.id);
    await db.from("dragon_tower_games").update({
      status: "cashed_out", payout, finished_at: new Date().toISOString(),
    }).eq("id", game_id);

    return NextResponse.json({ ok: true, payout, multiplier: game.current_multiplier });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
