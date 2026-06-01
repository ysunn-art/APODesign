export const CATEGORIES = [
  "ui_ux",
  "physical_product",
  "architecture",
  "signage",
  "packaging",
  "other",
  "gix",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  ui_ux: "UI / UX",
  physical_product: "Physical Product",
  architecture: "Architecture",
  signage: "Signage",
  packaging: "Packaging",
  other: "Other",
  gix: "GIX",
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  user_id: string;
  image_url: string;
  title: string;
  description: string;
  category: Category;
  status: SubmissionStatus;
  poop_score: number | null;
  heuristics_violated: string[] | null;
  roast_text: string | null;
  fix_suggestion: string | null;
  ai_confidence: number | null;
  vote_score: number;
  author: string | null;
  created_at: string;
}

export interface RoastReport {
  poop_score: number;
  heuristics_violated: string[];
  roast_text: string;
  fix_suggestion: string;
  confidence: number;
  should_moderate: boolean;
}

export interface DraftSubmission {
  pageNumber: number;
  /** data:image/png;base64,... — may be large; keep render scale low to stay under Vercel's 4.5 MB response limit */
  imageBase64: string;
  title: string;
  category: Category;
  /** 1–10 severity score */
  poop_score: number;
  heuristics_violated: string[];
  roast_text: string;
  fix_suggestion: string;
  /** 0.0–1.0 AI confidence */
  confidence: number;
  /** Retained from RoastReport; used to auto-deselect low-quality pages in the review UI */
  should_moderate: boolean;
}

// Same shape as DraftSubmission. Alias makes publish-route intent explicit.
export type EditedDraft = DraftSubmission;
