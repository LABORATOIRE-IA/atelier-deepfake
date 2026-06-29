import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

/*
 * Charte PROVISOIRE (valeurs de travail), PAS la charte officielle
 * Onepoint — à remplacer plus tard.
 * Police Poppins reprise du POC lunettes pour la cohérence visuelle.
 */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Atelier Deepfake",
  description:
    "Atelier Deepfake — showroom Agentic Livepoint, Lab IA Onepoint.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
