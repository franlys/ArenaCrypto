// GET /api/admin/users
// Lists all users with profile + wallet data for the admin panel.
// Auth: verifies the caller's JWT and confirms admin role.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAdminUser(req: NextRequest): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "").trim();
    if (!token) return null;

    // Verify JWT with service role — returns user data without hitting RLS
    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data?.user) return null;

    // Confirm admin role directly via admin client (bypasses RLS)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role?.toLowerCase() !== "admin") return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminId = await getAdminUser(req);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all auth users (includes email) — paginate to cover >50 users
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    // Fetch profiles + wallets
    const { data: profiles, error: profileError } = await adminClient
      .from("profiles")
      .select("id, username, role, is_premium, is_test_user, balance, created_at, wallets(balance_stablecoin, test_balance)")
      .order("created_at", { ascending: false });

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    // Merge email from auth into profiles
    const emailMap = new Map(authData.users.map(u => [u.id, u.email ?? ""] as [string, string]));

    const users = (profiles ?? []).map((p: any) => ({
      id:           p.id,
      email:        emailMap.get(p.id) ?? "",
      username:     p.username,
      role:         p.role,
      is_premium:   p.is_premium,
      is_test_user: p.is_test_user ?? false,
      balance:      p.balance ?? 0,
      balance_usdc: p.wallets?.balance_stablecoin ?? 0,
      test_balance: p.wallets?.test_balance ?? 0,
      created_at:   p.created_at,
    }));

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
