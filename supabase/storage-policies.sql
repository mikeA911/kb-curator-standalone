-- ============================================
-- STORAGE POLICIES FOR 'documents' BUCKET
-- Run this in Supabase SQL Editor
-- ============================================

-- NOTE: If you get "must be owner of table objects", it means you don't have 
-- permission to ALTER the table. You can usually skip the ALTER TABLE 
-- and INSERT INTO buckets parts if the bucket already exists.

-- 1. Create policies for storage.objects
-- We use DROP POLICY IF EXISTS to ensure we can rerun the script.

DO $$
BEGIN
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Curators can upload documents" ON storage.objects;
    DROP POLICY IF EXISTS "Curators can read documents" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
    DROP POLICY IF EXISTS "Curators can update documents" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can view buckets" ON storage.buckets;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not drop some policies. This might be due to permissions.';
END $$;

-- 2. Create policies for storage.objects

-- Allow curators and admins to upload documents
CREATE POLICY "Curators can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('curator', 'admin')
      AND is_active = true
    )
  )
);

-- Allow curators and admins to read documents
CREATE POLICY "Curators can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('curator', 'admin')
      AND is_active = true
    )
  )
);

-- Allow curators and admins to update documents
CREATE POLICY "Curators can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('curator', 'admin')
      AND is_active = true
    )
  )
);

-- Allow admins to delete documents
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
);

-- 3. Create policy for storage.buckets
CREATE POLICY "Authenticated users can view buckets"
ON storage.buckets FOR SELECT
TO authenticated
USING (true);
