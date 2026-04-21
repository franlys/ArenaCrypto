/**
 * POST /api/sports/bet
 * Coloca una apuesta en un mercado de evento deportivo externo (SportAPI).
 * Deduce el saldo de prueba o real según la wallet del usuario.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const acAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  const db = acAdmin();

  // Auth: leer JWT del usuario
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!bearer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await db.auth.getUser(bearer);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { market_id, pick_name, amount } = body;

  if (!market_id || !pick_name || !amount || amount <= 0) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  // Verificar que el mercado existe y está abierto
  const { data: market } = await db
    .from("external_bet_markets")
    .select("id, status, external_home_team, external_away_team")
    .eq("id", market_id)
    .single();

  if (!market || market.status !== "open") {
    return NextResponse.json({ error: "Mercado no disponible" }, { status: 400 });
  }

  // Validar que el pick es válido
  const validPicks = [market.external_home_team, market.external_away_team, "draw"];
  if (!validPicks.includes(pick_name)) {
    return NextResponse.json({ error: `Pick inválido. Opciones: ${validPicks.join(", ")}` }, { status: 400 });
  }

  // Obtener wallet del usuario
  const { data: wallet } = await db
    .from("wallets")
    .select("user_id, balance_stablecoin, test_balance, is_test_user")
    .eq("user_id", user.id)
    .single();

  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const isTest    = wallet.is_test_user ?? false;
  const balance   = isTest ? (wallet.test_balance ?? 0) : wallet.balance_stablecoin;
  const balanceCol = isTest ? "test_balance" : "balance_stablecoin";

  if (balance < amount) {
    return NextResponse.json({
      error: `Saldo insuficiente. Tienes $${balance.toFixed(2)} ${isTest ? "(prueba)" : "USDC"}`
    }, { status: 400 });
  }

  // Descontar saldo
  const { error: walletErr } = await db
    .from("wallets")
    .update({ [balanceCol]: balance - amount })
    .eq("user_id", user.id);

  if (walletErr) return NextResponse.json({ error: "Error deduciendo saldo" }, { status: 500 });

  // Guardar apuesta
  const { data: bet, error: betErr } = await db
    .from("external_bets")
    .insert({
      market_id,
      user_id:   user.id,
      pick_name,
      amount,
      is_test:   isTest,
      status:    "pending",
    })
    .select()
    .single();

  if (betErr) {
    // Revertir saldo si falla el insert
    await db.from("wallets").update({ [balanceCol]: balance }).eq("user_id", user.id);
    return NextResponse.json({ error: betErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bet });
}
