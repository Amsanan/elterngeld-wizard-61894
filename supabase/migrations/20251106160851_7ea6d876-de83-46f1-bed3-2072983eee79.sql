-- Create storage policies for form-templates bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to form-templates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'form-templates');

-- Allow authenticated users to read from form-templates
CREATE POLICY "Anyone can read form-templates"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'form-templates');

-- Allow authenticated users to update files in form-templates
CREATE POLICY "Authenticated users can update form-templates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'form-templates');

-- Allow authenticated users to delete files in form-templates
CREATE POLICY "Authenticated users can delete form-templates"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'form-templates');