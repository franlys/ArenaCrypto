// GET /api/admin/users
// Lists all users with profile + wallet data for the admin panel.
// Requires service role — never exposed to the client directly.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret === process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all auth users (includes email)
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Fetch profiles + wallets
  const { data: profiles, error: profileError } = await adminClient
    .from("profiles")
    .select("id, username, role, is_premium, is_test_user, balance, created_at, wallets(balance_stablecoin, test_balance)");

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Merge email from auth into profiles
  const emailMap = new Map(authData.users.map(u => [u.id, u.email ?? ""] as [string, string]));

  const users = (profiles ?? []).map((p: any) => ({
    id:               p.id,
    email:            emailMap.get(p.id) ?? "",
    username:         p.username,
    role:             p.role,
    is_premium:       p.is_premium,
    is_test_user:     p.is_test_user ?? false,
    balance:          p.balance ?? 0,
    balance_usdc:     p.wallets?.balance_stablecoin ?? 0,
    test_balance:     p.wallets?.test_balance ?? 0,
    created_at:       p.created_at,
  }));

  return NextResponse.json({ users });
}
