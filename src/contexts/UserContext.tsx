"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

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

  useEffect(() => {
    // Hard timeout: if Supabase doesn't respond in 3s, stop loading anyway
    const timeout = setTimeout(() => setLoading(false), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(timeout);
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
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    isPremium: !!profile?.is_premium,
    isAdmin: profile?.role?.toLowerCase() === 'admin',
    loading,
    refreshProfile: async () => {
      if (user) await fetchProfile(user.id);
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
