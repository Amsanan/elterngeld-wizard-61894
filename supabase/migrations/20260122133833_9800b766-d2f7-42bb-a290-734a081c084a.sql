-- Fix STORAGE_EXPOSURE: Make elterngeldantrag-drafts bucket private
-- This prevents unauthorized access to sensitive PDF documents containing personal data

UPDATE storage.buckets 
SET public = false 
WHERE id = 'elterngeldantrag-drafts';