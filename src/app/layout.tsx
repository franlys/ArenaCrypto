import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "ArenaCrypto | Elite Gaming Betting Platform",
  description:
    "Secure, real-time matching and betting for any game on any platform using Polygon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${orbitron.variable}`}>
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
