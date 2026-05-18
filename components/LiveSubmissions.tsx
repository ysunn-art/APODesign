"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LiveSubmissions() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel("submissions_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => {
          setPulse(true);
          setTimeout(() => setPulse(false), 1500);
          router.refresh();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-neutral-500" aria-live="polite">
      <span
        className={
          "inline-block h-2 w-2 rounded-full transition " +
          (pulse
            ? "bg-brand animate-ping"
            : connected
            ? "bg-green-500"
            : "bg-neutral-400")
        }
      />
      {connected ? "Live" : "Connecting…"}
    </div>
  );
}
