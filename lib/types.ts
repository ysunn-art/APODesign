export const CATEGORIES = [
  "ui_ux",
  "physical_product",
  "architecture",
  "signage",
  "packaging",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  ui_ux: "UI / UX",
  physical_product: "Physical Product",
  architecture: "Architecture",
  signage: "Signage",
  packaging: "Packaging",
  other: "Other",
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
