export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function scoreEmoji(score: number | null): string {
  if (score == null) return "❓";
  if (score >= 9) return "💩💩💩";
  if (score >= 7) return "💩💩";
  if (score >= 4) return "💩";
  return "✨";
}
