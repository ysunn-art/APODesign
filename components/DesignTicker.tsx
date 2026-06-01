"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { Submission } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

export function DesignTicker() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase
      .from("submissions")
      .select("id, title, image_url, poop_score, category, roast_text")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (data && data.length > 0) setSubmissions(data as Submission[]);
      });
  }, []);

  useGSAP(() => {
    if (!trackRef.current || submissions.length === 0) return;
    animRef.current?.kill();
    animRef.current = gsap.to(trackRef.current, {
      x: "-50%",
      duration: submissions.length * 5,
      ease: "none",
      repeat: -1,
    });
    return () => { animRef.current?.kill(); };
  }, { dependencies: [submissions], scope: trackRef });

  if (submissions.length === 0) return null;

  const items = [...submissions, ...submissions];

  return (
    <div
      className="relative w-screen -mx-6 overflow-hidden"
      style={{ height: "56vh", minHeight: 320 }}
      onMouseEnter={() => animRef.current?.pause()}
      onMouseLeave={() => animRef.current?.resume()}
    >
      <div ref={trackRef} className="flex h-full gap-3 w-max px-3">
        {items.map((s, i) => (
          <Link
            key={`${s.id}-${i}`}
            href={`/submission/${s.id}`}
            className="group relative h-full shrink-0 overflow-hidden rounded-2xl"
            style={{ width: "clamp(200px, 28vw, 380px)" }}
          >
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image_url}
              alt={s.title}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Score badge top-right */}
            {s.poop_score != null && (
              <div className="absolute top-3 right-3 inline-flex items-baseline gap-0.5 rounded-full bg-white/10 backdrop-blur border border-white/20 px-2.5 py-1 text-white">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/60">Score</span>
                <span className="font-mono text-sm tabular-nums ml-1">{s.poop_score}</span>
                <span className="font-mono text-[9px] text-white/50">/10</span>
              </div>
            )}

            {/* Info bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50 mb-1">
                {CATEGORY_LABELS[s.category]}
              </p>
              <h3 className="text-white font-medium text-[15px] leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                {s.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {/* Left/right fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-50 dark:from-ink-950 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-50 dark:from-ink-950 to-transparent z-10" />
    </div>
  );
}
