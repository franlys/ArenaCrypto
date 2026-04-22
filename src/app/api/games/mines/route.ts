import { NextRequest, NextResponse } from "next/server";
import { createClient as createAnon } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_PAYOUT = 25000;
const MAX_BET = 1000;

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

function calcMinesMultiplier(mines: number, revealed: number, amount: number): number {
  let prob = 1;
  for (let i = 0; i < revealed; i++) {
    prob *= (25 - mines - i) / (25 - i);
  }
  // Dynamic difficulty: higher edge to ensure platform solvency
  const houseEdge = amount > 100 ? 0.22 : 0.18; 
  return Math.max(1, Number(((1 - houseEdge) / prob).toFixed(4)));
}

function generateBoard(serverSeed: string, minesCount: number): boolean[] {
  let hash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  const board = Array(25).fill(false);
  const positions = new Set<number>();
  let attempts = 0;
  while (positions.size < minesCount && attempts < 10) {
    for (let i = 0; i < hash.length - 1; i += 2) {
      if (positions.size >= minesCount) break;
      const val = parseInt(hash.slice(i, i + 2), 16) % 25;
      positions.add(val);
    }
    if (positions.size < minesCount) hash = crypto.createHash("sha256").update(hash).digest("hex");
    attempts++;
  }
  positions.forEach(p => { board[p] = true; });
  return board;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  let { action, isTest } = body;
  const db = admin();

  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  if (profile?.is_test_user) isTest = true;

  const field = isTest ? "test_balance" : "balance_stablecoin";

  if (action === "get-active") {
    const { data: active } = await db.from("mines_games").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!active) return NextResponse.json({ active: false });
    return NextResponse.json({ active: true, game_id: active.id, amount: active.amount, mines_count: active.mines_count, revealed: active.revealed, current_multiplier: active.current_multiplier, is_test: active.is_test });
  }

  if (action === "start") {
    const { amount, mines_count = 5 } = body;
    if (!amount || amount <= 0 || mines_count < 1 || mines_count > 24) return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    // Enforce hard limit for everyone to protect economy
    if (amount > MAX_BET) return NextResponse.json({ error: `Apuesta máxima permitida: $${MAX_BET}` }, { status: 400 });

    const { data: active } = await db.from("mines_games").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (active) return NextResponse.json({ error: "Ya tienes una partida activa" }, { status: 400 });

    const { data: wallet } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });
    const bal = Number((wallet as any)[field]);
    if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

    await db.from("wallets").update({ [field]: Number((bal - amount).toFixed(2)) }).eq("user_id", user.id);
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const { data: game } = await db.from("mines_games").insert({ user_id: user.id, amount, is_test: isTest ?? false, mines_count, server_seed: serverSeed, current_multiplier: 1.0 }).select().single();
    return NextResponse.json({ ok: true, game_id: game.id, mines_count });
  }

  if (action === "reveal") {
    const { game_id, tile_index } = body;
    const { data: game } = await db.from("mines_games").select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active") return NextResponse.json({ error: "Partida terminada" }, { status: 400 });

    const board = generateBoard(game.server_seed, game.mines_count);
    const isMine = board[tile_index];
    const newRevealed = [...game.revealed, tile_index];

    if (isMine) {
      await db.from("mines_games").update({ status: "exploded", board, revealed: newRevealed, payout: 0, finished_at: new Date().toISOString() }).eq("id", game_id);
      return NextResponse.json({ ok: true, is_mine: true, board, payout: 0 });
    }

    const newMult = calcMinesMultiplier(game.mines_count, newRevealed.length, game.amount);
    await db.from("mines_games").update({ revealed: newRevealed, current_multiplier: newMult }).eq("id", game_id);
    return NextResponse.json({ ok: true, is_mine: false, tile_index, multiplier: newMult, gems_remaining: 25 - game.mines_count - newRevealed.length });
  }

  if (action === "cashout") {
    const { game_id } = body;
    const { data: game } = await db.from("mines_games").select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active" || game.revealed.length === 0) return NextResponse.json({ error: "Nada que cobrar" }, { status: 400 });

    const payoutRaw = Number((game.amount * game.current_multiplier).toFixed(2));
    const payout = Math.min(payoutRaw, MAX_PAYOUT);
    const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    await db.from("wallets").update({ [field]: Number((Number((w as any)[field]) + payout).toFixed(2)) }).eq("user_id", user.id);

    const board = generateBoard(game.server_seed, game.mines_count);
    await db.from("mines_games").update({ status: "cashed_out", board, payout, finished_at: new Date().toISOString() }).eq("id", game_id);
    return NextResponse.json({ ok: true, payout, multiplier: game.current_multiplier, board });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
