import { supabase } from "../supabase";
import { deriveUserAddress } from "./derivation";

/**
 * ARENACRYPTO: Pro-Max Account Initialization
 * This logic ensures every user has a unique ID, profile, and HD Deposit Address.
 */

export async function initializeUserAccount(userId: string) {
  try {
    // 1. Check if user already has an address assigned
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('deposit_address, derivation_index')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // 2. If no deposit_address, generate and save it
    if (!profile.deposit_address) {
      console.log(`[INIT] No address found for user ${userId}. Generating via HD Wallet...`);
      
      const newAddress = deriveUserAddress(profile.derivation_index);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ deposit_address: newAddress })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      console.log(`[INIT] Unique deposit address assigned: ${newAddress}`);
      return newAddress;
    }

    return profile.deposit_address;
  } catch (err) {
    console.error(`[CRITICAL] Error initializing account:`, err);
    throw err;
  }
}
