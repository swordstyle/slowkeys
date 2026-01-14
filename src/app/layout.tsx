import type { Metadata } from "next";
import { Special_Elite } from "next/font/google";
import "./globals.css";

const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-typewriter",
});

export const metadata: Metadata = {
  title: "Typewriter",
  description: "A minimalist typewriter writing app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${specialElite.variable}`}>
        {children}
      </body>
    </html>
  );
}
