-- =====================================================
-- PHASE 1: Create new antrag_progress table
-- =====================================================

-- Create antrag_progress table (supports multiple applications per user)
CREATE TABLE IF NOT EXISTS public.antrag_progress (
  antrag_id UUID PRIMARY KEY REFERENCES public.antraege(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  partial_pdf_path TEXT,
  field_mappings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.antrag_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for antrag_progress
CREATE POLICY "Users can view own antrag progress"
  ON public.antrag_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own antrag progress"
  ON public.antrag_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own antrag progress"
  ON public.antrag_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own antrag progress"
  ON public.antrag_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_antrag_progress_updated_at
  BEFORE UPDATE ON public.antrag_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_antrag_progress_user_id ON public.antrag_progress(user_id);

-- =====================================================
-- PHASE 2: Migrate data from legacy table
-- =====================================================

-- Migrate existing progress data from elterngeldantrag_progress
-- For each user, find or create an antrag and migrate the progress
INSERT INTO public.antrag_progress (antrag_id, user_id, current_step, completed_steps, partial_pdf_path, field_mappings, created_at, updated_at)
SELECT 
  COALESCE(
    (SELECT a.id FROM public.antraege a WHERE a.user_id = ep.user_id ORDER BY a.created_at DESC LIMIT 1),
    gen_random_uuid()
  ) as antrag_id,
  ep.user_id,
  ep.current_step,
  ep.completed_steps,
  ep.partial_pdf_path,
  ep.field_mappings,
  ep.created_at,
  ep.updated_at
FROM public.elterngeldantrag_progress ep
WHERE EXISTS (SELECT 1 FROM public.antraege a WHERE a.user_id = ep.user_id)
ON CONFLICT (antrag_id) DO UPDATE SET
  current_step = EXCLUDED.current_step,
  completed_steps = EXCLUDED.completed_steps,
  partial_pdf_path = EXCLUDED.partial_pdf_path,
  field_mappings = EXCLUDED.field_mappings,
  updated_at = now();

-- =====================================================
-- PHASE 3: Fix pdf_field_mappings RLS policies for admin
-- =====================================================

-- Drop existing policies that need updating (using correct names)
DROP POLICY IF EXISTS "Users can update field mappings" ON public.pdf_field_mappings;
DROP POLICY IF EXISTS "Users can delete field mappings" ON public.pdf_field_mappings;

-- Create admin-only policies for update and delete
CREATE POLICY "Admins can update field mappings"
  ON public.pdf_field_mappings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete field mappings"
  ON public.pdf_field_mappings
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));