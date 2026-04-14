import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
