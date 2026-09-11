/**
 * Rotlayout: ramen runt alla sidor.
 *
 * Sätter <html lang="sv">, typsnitt, sidhuvud med menyn och en centrerad innehållsyta.
 * Här finns också metadata (titel, noindex) och tvång på dynamisk rendering,
 * så att CSP-noncen från proxy.ts blir ny för varje request.
 */
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { connection } from "next/server";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Måendedagbok", template: "%s · Måendedagbok" },
  description: "Personlig panik- och måendedagbok",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // CSP-nonce skapas per request i proxy.ts, så alla sidor måste renderas dynamiskt.
  await connection();

  return (
    <html lang="sv" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">Måendedagbok</span>
            <SiteNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
