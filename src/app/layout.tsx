import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProvider } from "@/components/theme-provider";
import { CountPageLoad } from "@/features/usage/count-page-load";

const montserratSans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const montserratHeading = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-heading",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
