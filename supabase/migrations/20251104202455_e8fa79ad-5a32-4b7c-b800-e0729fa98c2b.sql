-- Add confidence scores column to einkommensteuerbescheide table
ALTER TABLE einkommensteuerbescheide 
ADD COLUMN confidence_scores jsonb DEFAULT '{}'::jsonb;