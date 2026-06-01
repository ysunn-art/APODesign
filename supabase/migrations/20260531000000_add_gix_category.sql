-- Add 'gix' to the category check constraint on submissions.
-- GIX category is reserved for internal GIX program bad design submissions
-- displayed exclusively on the GIX Hall of Famous page.

ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_category_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_category_check
  CHECK (category IN ('ui_ux', 'physical_product', 'architecture', 'signage', 'packaging', 'other', 'gix'));
