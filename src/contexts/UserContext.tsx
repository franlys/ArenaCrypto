"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

// If onAuthStateChange never fires (network failure), release the spinner after this
const AUTH_LOADING_TIMEOUT_MS = 12_000;
// Sign out after 30 min of zero activity
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown", "touchstart", "scroll", "click",
] as const;

interface UserContextType {
  user: User | null;
  profile: any | null;
  isPremium: boolean;
  isAdmin: boolean;
  isTestUser: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  isPremium: false,
  isAdmin: false,
  isTestUser: false,
  loading: true,
  refreshProfile: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const inactivityTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable handler — same reference across renders, no stale closure
  const resetInactivityTimer = useRef(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      await supabase.auth.signOut();
      // onAuthStateChange handles clearing user + profile
    }, INACTIVITY_TIMEOUT_MS);
  });

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, wallets(balance_stablecoin, test_balance)")
        .eq("id", userId)
        .single();
      if (!error && data) setProfile(data);
    } catch {
      // Profile missing or network error — user is still authenticated
    }
  };

  // ── Auth init ─────────────────────────────────────────────────────────────
  // Use ONLY onAuthStateChange — it fires the INITIAL_SESSION event on mount,
  // which replaces the need for a separate getSession() call. Using both
  // creates a race condition where the 6s timeout fires while fetchProfile is
  // still awaiting, leaving user=null and triggering a redirect to /login.
  useEffect(() => {
    let mounted = true;

    // Safety net: if INITIAL_SESSION never fires (Supabase down / wrong env vars),
    // release the loading state so the UI doesn't stay frozen on "AUTENTICANDO…"
    const loadingTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, AUTH_LOADING_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Cancel the safety-net timeout — we have a real answer
        clearTimeout(loadingTimeout);

        const currentUser = session?.user ?? null;
        setUser(currentUser as User | null);

        // TOKEN_REFRESHED: the session is silently renewed in the background.
        // The user object hasn't changed — skip re-fetching the profile to avoid
        // a brief null flash that would trigger AuthGuard redirects.
        if (event === 'TOKEN_REFRESHED') {
          if (mounted) setLoading(false);
          return;
        }

        try {
          if (currentUser) {
            await fetchProfile(currentUser.id);
          } else {
            setProfile(null);
          }
        } finally {
          // Always release the loading state — even if fetchProfile hangs or throws
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // ── Inactivity timer — only active while logged in ────────────────────────
  useEffect(() => {
    if (!user) {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
      return;
    }

    const handler = resetInactivityTimer.current;
    handler(); // start timer on login
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }));

    // Reset inactivity timer when the user comes back to the tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handler();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handler));
      document.removeEventListener('visibilitychange', handleVisibility);
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
    };
  }, [user]);

  const value = {
    user,
    profile,
    isPremium:  !!profile?.is_premium,
    isAdmin:    profile?.role?.toLowerCase() === "admin",
    isTestUser: !!profile?.is_test_user,
    loading,
    refreshProfile: async () => {
      if (user) await fetchProfile(user.id);
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
