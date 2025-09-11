import { supabase } from '@/integrations/supabase/client';

export interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  publicUrl: string;
  storagePath: string;
}

export class SupabaseStorageService {
  private static readonly BUCKET_NAME = 'form-uploads';

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(file: File): Promise<UploadedFile> {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        id: fileName,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        publicUrl,
        storagePath: filePath
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(storagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([storagePath]);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('File delete error:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(storagePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    return publicUrl;
  }

  /**
   * Check if storage bucket exists and is accessible
   */
  static async ensureBucketExists(): Promise<void> {
    try {
      // Try to list files in bucket to verify access
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      if (error) {
        console.error('Storage bucket access error:', error);
        throw new Error(`Storage bucket not accessible: ${error.message}. Please ensure the bucket exists and has proper RLS policies.`);
      }
    } catch (error) {
      console.error('Bucket check error:', error);
      throw error;
    }
  }
}
