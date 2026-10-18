import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import { NavigationMemory } from "@/components/back-link";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { CountPageLoad } from "@/features/usage/count-page-load";

// Self-hosted, so `next build` never fetches from Google Fonts: a failed
// download there fails the build as an unrelated-looking "Module not found".
// Both files are the google/fonts variable fonts subset to latin + latin-ext,
// so names with ł, ş or č keep the brand font (licences: OFL-*.txt beside them).
const montserratSans = localFont({
  src: "./fonts/montserrat.woff2",
  weight: "400 600",
  variable: "--font-sans",
});

const montserratHeading = localFont({
  src: "./fonts/montserrat.woff2",
  weight: "700 800",
  variable: "--font-heading",
});

const geistMono = localFont({
  src: "./fonts/geist-mono.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Buli Hub",
  description: "Die Turnierplattform der VGC Bundesliga",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${montserratSans.variable} ${montserratHeading.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NavigationMemory />
          {children}
          <SiteFooter />
        </ThemeProvider>
        {/* Usage counting, off the critical path: the shell streams while
            the count is written (docs/plans/usage-stats.md). */}
        <Suspense fallback={null}>
          <CountPageLoad />
        </Suspense>
      </body>
    </html>
  );
}
