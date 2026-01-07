import { Onest } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ThemeScript } from "@/components/providers/ThemeScript";
import { YandexMetrika } from "@/components/analytics/YandexMetrika";
import { ClientLayout } from "@/components/shared/ClientLayout";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <YandexMetrika />
      </head>
      <body
        className={`${onest.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen`}
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
