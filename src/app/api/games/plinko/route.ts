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

// Fixed lengths for 8, 12, 16 rows (9, 13, 17 slots)
const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    12: [10, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
    16: [16, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16],
  },
  medium: {
    8:  [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    12: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
    16: [110, 41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
  },
  high: {
    8:  [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
    12: [170, 24, 8.1, 2.0, 0.7, 0.2, 0.1, 0.2, 0.7, 2.0, 8.1, 24, 170],
    16: [620, 190, 26, 9.0, 4.0, 2.0, 0.5, 0.2, 0.1, 0.2, 0.5, 2.0, 4.0, 9.0, 26, 190, 620],
  }
};

function dropPlinko(serverSeed: string, rows: number): { path: string[]; slot: number } {
  // Use a unique seed per drop
  const dropSeed = crypto.createHash("sha256").update(serverSeed + Date.now().toString()).digest("hex");
  const path: string[] = [];
  let slot = 0;
  for (let i = 0; i < rows; i++) {
    // Standard Plinko: each row is a 50/50 left/right decision
    const bit = parseInt(dropSeed.slice(i * 2, i * 2 + 2), 16) % 2;
    if (bit === 0) { path.push("L"); } else { path.push("R"); slot++; }
  }
  return { path, slot };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  let { amount, risk_level = "medium", rows = 16, isTest = false } = body;

  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  if (![8, 12, 16].includes(rows)) return NextResponse.json({ error: "Filas inválidas" }, { status: 400 });
  
  const db = admin();

  // SECURITY: Force test mode for test users
  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  if (profile?.is_test_user) {
    isTest = true;
  }

  const field = isTest ? "test_balance" : "balance_stablecoin";

  const { data: wallet } = await db.from("wallets").select(field).eq("user_id", user.id).single();
  if (!wallet) return NextResponse.json({ error: "Wallet no encontrada" }, { status: 400 });

  const bal = Number((wallet as Record<string, unknown>)[field]);
  if (bal < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });

  // Deduct
  await db.from("wallets").update({ [field]: Number((bal - amount).toFixed(2)) }).eq("user_id", user.id);

  const serverSeed = crypto.randomBytes(32).toString("hex");
  const { path, slot } = dropPlinko(serverSeed, rows);
  const multiplier = MULTIPLIERS[risk_level][rows][slot] ?? 0;
  const payout = Number((amount * multiplier).toFixed(2));

  // Credit payout
  if (payout > 0) {
    const { data: w } = await db.from("wallets").select(field).eq("user_id", user.id).single();
    await db.from("wallets").update({ [field]: Number((Number((w as any)[field]) + payout).toFixed(2)) }).eq("user_id", user.id);
  }

  await db.from("plinko_drops").insert({
    user_id: user.id, amount, is_test: isTest,
    risk_level, rows, path, slot, multiplier, payout,
  });

  return NextResponse.json({ ok: true, path, slot, multiplier, payout });
}
