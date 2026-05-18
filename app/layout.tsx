import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "A Piece of Design",
  description: "The internet's most entertaining bad design awards — powered by AI.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="font-bold text-lg tracking-tight">
              💩 A Piece of Design
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:underline">Gallery</Link>
              <Link href="/leaderboard" className="hover:underline">Leaderboard</Link>
              <Link href="/hall-of-shame" className="hover:underline">Hall of Shame</Link>
              <Link
                href="/submit"
                className="rounded-md bg-brand text-white px-3 py-1.5 hover:bg-brand-dark"
              >
                Submit
              </Link>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 hidden sm:inline">{user.email}</span>
                  <SignOutButton />
                </div>
              ) : (
                <SignInButton />
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-12">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-500 flex justify-between">
            <span>TECHIN 510 — A Piece of Design</span>
            <a href="https://github.com/" className="hover:underline">GitHub</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
