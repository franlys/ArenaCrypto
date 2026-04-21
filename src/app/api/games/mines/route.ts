/**
 * POST /api/games/mines
 * Actions: start | reveal | cashout
 * House edge: 3% applied via multiplier table
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Multiplier table: mines_count -> gems_revealed -> multiplier (3% house edge)
function calcMinesMultiplier(mines: number, revealed: number): number {
  // Probability: (25-mines)! / (25-mines-revealed)! / (25! / (25-revealed)!)
  // Then apply 0.97 house edge
  let prob = 1;
  for (let i = 0; i < revealed; i++) {
    prob *= (25 - mines - i) / (25 - i);
  }
  return Math.max(1, Number((0.97 / prob).toFixed(4)));
}

function generateBoard(serverSeed: string, minesCount: number): boolean[] {
  const hash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  const board = Array(25).fill(false);
  const positions = new Set<number>();
  let offset = 0;
  while (positions.size < minesCount) {
    const val = parseInt(hash.slice(offset, offset + 2), 16) % 25;
    positions.add(val);
    offset = (offset + 2) % 62;
  }
  positions.forEach(p => { board[p] = true; });
  return board;
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
    const { amount, mines_count = 5 } = body;
    if (!amount || amount <= 0 || mines_count < 1 || mines_count > 24)
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

    // Check no active game
    const { data: active } = await db().from("mines_games")
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
    const { data: game } = await db().from("mines_games").insert({
      user_id: user.id, amount, is_test: isTest,
      mines_count, server_seed: serverSeed,
      current_multiplier: 1.0,
    }).select().single();

    return NextResponse.json({ ok: true, game_id: game.id, mines_count });
  }

  if (action === "reveal") {
    const { game_id, tile_index } = body;
    if (tile_index < 0 || tile_index > 24)
      return NextResponse.json({ error: "Tile inválido" }, { status: 400 });

    const { data: game } = await db().from("mines_games")
      .select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active")
      return NextResponse.json({ error: "Partida no encontrada o terminada" }, { status: 400 });

    if (game.revealed.includes(tile_index))
      return NextResponse.json({ error: "Tile ya revelado" }, { status: 400 });

    const board = generateBoard(game.server_seed, game.mines_count);
    const isMine = board[tile_index];
    const newRevealed = [...game.revealed, tile_index];

    if (isMine) {
      // EXPLODED — lose bet, reveal board
      await db().from("mines_games").update({
        status: "exploded", board, revealed: newRevealed,
        payout: 0, finished_at: new Date().toISOString(),
      }).eq("id", game_id);
      return NextResponse.json({ ok: true, is_mine: true, board, payout: 0 });
    }

    const newMult = calcMinesMultiplier(game.mines_count, newRevealed.length);
    await db().from("mines_games").update({
      revealed: newRevealed, current_multiplier: newMult,
    }).eq("id", game_id);

    const gemsRemaining = 25 - game.mines_count - newRevealed.length;
    return NextResponse.json({
      ok: true, is_mine: false, tile_index,
      multiplier: newMult, gems_remaining: gemsRemaining,
    });
  }

  if (action === "cashout") {
    const { game_id } = body;
    const { data: game } = await db().from("mines_games")
      .select("*").eq("id", game_id).eq("user_id", user.id).single();
    if (!game || game.status !== "active" || game.revealed.length === 0)
      return NextResponse.json({ error: "Nada que cobrar" }, { status: 400 });

    const payout = Number((game.amount * game.current_multiplier).toFixed(2));
    const col = game.is_test ? "test_balance" : "balance_stablecoin";
    const { data: wallet } = await db().from("wallets").select(col).eq("user_id", user.id).single();
    await db().from("wallets").update({ [col]: (wallet as any)[col] + payout }).eq("user_id", user.id);

    const board = generateBoard(game.server_seed, game.mines_count);
    await db().from("mines_games").update({
      status: "cashed_out", board, payout,
      finished_at: new Date().toISOString(),
    }).eq("id", game_id);

    return NextResponse.json({ ok: true, payout, multiplier: game.current_multiplier, board });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
