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
  expert: { tiles: 5, mines: 4 }, 
};

const LEVEL_MULTIPLIERS: Record<string, number[]> = {
  easy:   [1.05, 1.15, 1.30, 1.50, 1.75, 2.05, 2.45, 2.95, 3.50],
  medium: [1.20, 1.50, 1.90, 2.40, 3.20, 4.30, 6.00, 8.50, 12.0],
  hard:   [1.75, 2.80, 4.50, 7.50, 12.0, 20.0, 32.0, 50.0, 70.0],
  expert: [4.00, 10.0, 25.0, 50.0, 90.0, 160, 280, 450, 650],
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

  // SECURITY: Force test mode for test users
  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  if (profile?.is_test_user) {
    isTest = true;
  }

  const field = isTest ? "test_balance" : "balance_stablecoin";

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
    if (amount > MAX_BET && !isTest) return NextResponse.json({ error: `Apuesta máxima permitida: $${MAX_BET}` }, { status: 400 });

    const { data: active } = await db.from("dragon_tower_games")
      .select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (active) return NextResponse.json({ error: "Ya tienes una partida activa" }, { status: 400 });

    const { data: wallet } = await db.from("wallets").select(field).eq("user_id", user.id).single();
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
