"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function SignInButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-ink-300 dark:border-ink-700 px-3.5 py-1.5 text-[13px] font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-900 active:scale-[0.98] transition"
      >
        Sign in
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-1.5 shadow-diffusion z-30">
          <ProviderButton provider="github" label="Continue with GitHub" />
          <ProviderButton provider="google" label="Continue with Google" />
        </div>
      )}
    </div>
  );
}

function ProviderButton({ provider, label }: { provider: "google" | "github"; label: string }) {
  async function onClick() {
    const supabase = getBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400 w-12">
        {provider}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-full border border-ink-300 dark:border-ink-700 px-3 py-1 text-[12px] font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-900 active:scale-[0.98] transition"
      >
        Sign out
      </button>
    </form>
  );
}
