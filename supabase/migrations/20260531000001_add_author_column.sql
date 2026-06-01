-- Add optional author field for GIX category submissions.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS author text;
