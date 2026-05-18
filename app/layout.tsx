import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import "./globals.css";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "A Piece of Design",
  description:
    "The internet's most entertaining bad design awards — powered by AI. Submit, score, roast, vote.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <header className="sticky top-0 z-30 backdrop-blur-md bg-ink-50/80 dark:bg-ink-950/70 border-b border-ink-200/70 dark:border-ink-800/80">
          <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between gap-6">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 font-semibold tracking-tight text-ink-900 dark:text-ink-50"
            >
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full bg-accent transition-transform group-hover:scale-110"
              />
              <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                A Piece of
              </span>
              <span className="text-[15px]">Design</span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2 text-sm">
              <NavLink href="/">Gallery</NavLink>
              <NavLink href="/leaderboard">Leaderboard</NavLink>
              <NavLink href="/hall-of-shame">Hall of Shame</NavLink>
              <Link
                href="/submit"
                className="ml-1 sm:ml-2 inline-flex items-center gap-1.5 rounded-full bg-ink-900 dark:bg-ink-50 text-ink-50 dark:text-ink-900 px-3.5 py-1.5 text-[13px] font-medium hover:opacity-90 active:scale-[0.98] transition"
              >
                Submit
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </Link>
              {user ? (
                <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-ink-200 dark:border-ink-800">
                  <span className="font-mono text-[11px] text-ink-500 dark:text-ink-400 max-w-[160px] truncate">
                    {user.email}
                  </span>
                  <SignOutButton />
                </div>
              ) : (
                <div className="ml-1">
                  <SignInButton />
                </div>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-6 py-10 sm:py-14">{children}</main>

        <footer className="mt-24 border-t border-ink-200 dark:border-ink-800">
          <div className="mx-auto max-w-[1400px] px-6 py-8 flex items-center justify-between text-[12px] font-mono uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">
            <span>TECHIN 510 · A Piece of Design</span>
            <a href="https://github.com/" className="hover:text-ink-900 dark:hover:text-ink-100 transition">
              GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-full text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100 hover:bg-ink-100 dark:hover:bg-ink-900 transition"
    >
      {children}
    </Link>
  );
}
