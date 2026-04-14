"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { polygon, polygonAmoy } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "";

// Module-level singletons — prevent double-init from React StrictMode
// (useState lazy init still runs twice per mount in dev)
let wagmiConfig: ReturnType<typeof getDefaultConfig> | null = null;
let queryClientSingleton: QueryClient | null = null;

function getWagmiConfig() {
  if (!wagmiConfig) {
    wagmiConfig = getDefaultConfig({
      appName: "ArenaCrypto",
      projectId,
      chains: [polygon, polygonAmoy],
      ssr: true,
    });
  }
  return wagmiConfig;
}

function getQueryClient() {
  if (!queryClientSingleton) {
    queryClientSingleton = new QueryClient();
  }
  return queryClientSingleton;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const config = getWagmiConfig();
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#00F5FF",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
