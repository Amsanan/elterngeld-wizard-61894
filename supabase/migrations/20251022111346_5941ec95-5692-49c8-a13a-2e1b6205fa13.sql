-- Create antraege table
CREATE TABLE public.antraege (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.antraege ENABLE ROW LEVEL SECURITY;

-- RLS policies for antraege
CREATE POLICY "Users can view their own antraege"
ON public.antraege
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own antraege"
ON public.antraege
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own antraege"
ON public.antraege
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own antraege"
ON public.antraege
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_antraege_updated_at
BEFORE UPDATE ON public.antraege
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create join table between antraege and geburtsurkunden
CREATE TABLE public.antrag_geburtsurkunden (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  antrag_id UUID NOT NULL REFERENCES public.antraege(id) ON DELETE CASCADE,
  geburtsurkunde_id UUID NOT NULL REFERENCES public.geburtsurkunden(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(antrag_id, geburtsurkunde_id)
);

-- Enable RLS
ALTER TABLE public.antrag_geburtsurkunden ENABLE ROW LEVEL SECURITY;

-- RLS policies for antrag_geburtsurkunden
CREATE POLICY "Users can view their own antrag_geburtsurkunden"
ON public.antrag_geburtsurkunden
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.antraege
    WHERE antraege.id = antrag_geburtsurkunden.antrag_id
    AND antraege.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own antrag_geburtsurkunden"
ON public.antrag_geburtsurkunden
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.antraege
    WHERE antraege.id = antrag_geburtsurkunden.antrag_id
    AND antraege.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own antrag_geburtsurkunden"
ON public.antrag_geburtsurkunden
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.antraege
    WHERE antraege.id = antrag_geburtsurkunden.antrag_id
    AND antraege.user_id = auth.uid()
  )
);