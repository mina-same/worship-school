-- Create storage bucket for form uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-uploads',
  'form-uploads',
  true,
  10485760, -- 10MB limit
  ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow public read access to files
CREATE POLICY "Allow public read access to files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'form-uploads'
);

-- Policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow users to update their own files
CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);
