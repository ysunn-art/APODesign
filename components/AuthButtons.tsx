"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function SignInButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        Sign in
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-2 z-20">
          <ProviderButton provider="google" label="Continue with Google" />
          <ProviderButton provider="github" label="Continue with GitHub" />
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
      className="block w-full text-left px-3 py-2 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      {label}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        Sign out
      </button>
    </form>
  );
}
