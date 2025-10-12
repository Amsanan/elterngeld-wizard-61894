-- Update storage policies for form-templates bucket to allow uploads

-- Drop the existing public view policy if it exists
DROP POLICY IF EXISTS "Public can view form templates" ON storage.objects;

-- Allow authenticated users to upload templates
CREATE POLICY "Authenticated users can upload templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'form-templates' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update templates
CREATE POLICY "Authenticated users can update templates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'form-templates' AND
    auth.role() = 'authenticated'
  );

-- Allow everyone to view templates (public bucket)
CREATE POLICY "Anyone can view templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'form-templates');