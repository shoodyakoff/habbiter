import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Habbiter",
  description: "Track your daily habits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${onest.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <Header />
        <main className="flex-1 pb-24 pt-4 px-4 container mx-auto">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
