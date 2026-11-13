import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parli Review — Make every round count",
  description: "Record your parliamentary debate, trace every argument, and return to your next round stronger.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
