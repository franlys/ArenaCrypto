"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

// Max time to wait for getSession() before giving up and showing login
const AUTH_LOADING_TIMEOUT_MS = 6_000;
// Sign out after X ms of zero user activity
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

interface UserContextType {
  user: User | null;
  profile: any | null;
  isPremium: boolean;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  isPremium: false,
  isAdmin: false,
  loading: true,
  refreshProfile: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable handler stored in a ref — same reference across renders, no stale closures
  const resetInactivityTimer = useRef(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      await supabase.auth.signOut();
      // onAuthStateChange will clear user + profile state
    }, INACTIVITY_TIMEOUT_MS);
  });

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, wallets(balance_stablecoin)")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  // ── Auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Safety net: if getSession() never resolves (expired token, network issue),
    // release the loading state after 6s so the UI never stays stuck on "AUTENTICANDO…"
    const loadingTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, AUTH_LOADING_TIMEOUT_MS);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      clearTimeout(loadingTimeout);
      const currentUser = session?.user ?? null;
      setUser(currentUser as User);
      if (currentUser) await fetchProfile(currentUser.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser as User);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // ── Inactivity timer — only runs while a user is logged in ────────────────
  useEffect(() => {
    if (!user) {
      // User logged out — cancel any pending timer
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
      return;
    }

    const handler = resetInactivityTimer.current;

    // Start the timer immediately on login
    handler();

    // Reset timer on any user activity
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handler));
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
    };
  }, [user]);

  const value = {
    user,
    profile,
    isPremium: !!profile?.is_premium,
    isAdmin: profile?.role?.toLowerCase() === "admin",
    loading,
    refreshProfile: async () => {
      if (user) await fetchProfile(user.id);
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
