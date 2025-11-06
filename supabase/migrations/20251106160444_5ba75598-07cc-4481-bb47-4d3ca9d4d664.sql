-- Create table for cleanup settings
CREATE TABLE IF NOT EXISTS public.document_cleanup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cleanup_interval_hours integer NOT NULL DEFAULT 48,
  is_enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_cleanup_settings UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.document_cleanup_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own cleanup settings"
  ON public.document_cleanup_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cleanup settings"
  ON public.document_cleanup_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cleanup settings"
  ON public.document_cleanup_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cleanup settings"
  ON public.document_cleanup_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_document_cleanup_settings_updated_at
  BEFORE UPDATE ON public.document_cleanup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();