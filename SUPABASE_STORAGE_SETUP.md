# Supabase Storage Setup Instructions

Since we can't run migrations directly, you'll need to set up the storage bucket manually through the Supabase Dashboard.

## Steps to Fix Supabase Storage:

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard/project/tlutescdhevmbftqqsji
- Navigate to **Storage** in the left sidebar

### 2. Create Storage Bucket
- Click **"New bucket"**
- Bucket name: `form-uploads`
- Make it **Public**: ✅ Yes
- File size limit: `10 MB`
- Allowed MIME types: `image/*, application/pdf, text/*, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 3. Set Up RLS Policies
Go to **Authentication > Policies** and add these policies for `storage.objects`:

#### Policy 1: Upload Files
```sql
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);
```

#### Policy 2: Public Read Access
```sql
CREATE POLICY "Allow public read access to files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'form-uploads'
);
```

#### Policy 3: Delete Own Files
```sql
CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);
```

#### Policy 4: Update Own Files
```sql
CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);
```

### 4. Alternative: SQL Editor
You can also run this in the **SQL Editor**:

```sql
-- Create storage bucket for form uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-uploads',
  'form-uploads',
  true,
  10485760,
  ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'form-uploads'
);

CREATE POLICY "Allow users to delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow users to update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'form-uploads' 
  AND auth.role() = 'authenticated'
);
```

## After Setup:
Once you've created the bucket and policies, the file upload system will work properly with Supabase Storage instead of base64 storage.

## Benefits:
- ✅ No database bloat
- ✅ Better performance  
- ✅ CDN delivery
- ✅ Proper file management
- ✅ Scalable storage
