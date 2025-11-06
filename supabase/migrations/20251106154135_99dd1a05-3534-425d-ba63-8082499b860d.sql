-- Create table for tracking Elterngeldantrag progress
CREATE TABLE elterngeldantrag_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 13),
  completed_steps INTEGER[] DEFAULT '{}',
  partial_pdf_path TEXT,
  field_mappings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE elterngeldantrag_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own progress"
  ON elterngeldantrag_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON elterngeldantrag_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON elterngeldantrag_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON elterngeldantrag_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_elterngeldantrag_progress_updated_at
  BEFORE UPDATE ON elterngeldantrag_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for draft PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('elterngeldantrag-drafts', 'elterngeldantrag-drafts', true);

-- Storage RLS Policies
CREATE POLICY "Users can upload own drafts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'elterngeldantrag-drafts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own drafts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'elterngeldantrag-drafts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own drafts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'elterngeldantrag-drafts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own drafts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'elterngeldantrag-drafts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );