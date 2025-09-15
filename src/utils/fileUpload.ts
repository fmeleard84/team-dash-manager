import { supabase } from '@/integrations/supabase/client';

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  path: string;
}

// Function to create references to Kanban files in project Drive folder
export const syncKanbanFilesToDrive = async (
  files: UploadedFile[],
  projectId: string
): Promise<void> => {
  if (!files.length || !projectId) return;

  try {
    console.log('📁 Syncing Kanban files to Drive:', files.length, 'files for project', projectId);
    
    // Get current user for uploaded_by field
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      console.error('❌ User authentication required for Drive sync:', userError);
      return;
    }

    console.log('🚀 Calling sync-kanban-files Edge Function with service role permissions');
    console.log('👤 User ID:', user.id, 'Email:', user.email);
    
    // Use Edge Function with service role to bypass RLS restrictions
    const { data, error } = await supabase.functions.invoke('sync-kanban-files', {
      body: {
        files: files,
        projectId: projectId,
        userId: user.id, // Send UUID instead of email
        userEmail: user.email // Keep email for reference
      }
    });

    if (error) {
      console.error('❌ Failed to sync files via Edge Function:', error);
      console.error('Details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Successfully synced files to Drive project folder via Edge Function:', data);
    console.log('📂 Files are now accessible in project Drive and Kanban');
    
  } catch (error) {
    console.error('❌ Error syncing files to Drive:', error);
    // Don't throw - keep Kanban functionality working even if Drive sync fails
  }
};

export const uploadFileToSupabase = async (
  file: File,
  bucket: string = 'kanban-files',
  folder: string = 'cards'
): Promise<UploadedFile> => {
  try {
    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    console.log('🔄 Uploading file:', file.name, 'to:', fileName);

    // Upload du fichier vers Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Récupérer l'URL publique du fichier
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Could not get public URL for uploaded file');
    }

    console.log('📎 Public URL:', urlData.publicUrl);

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      url: urlData.publicUrl,
      uploadedAt: new Date().toISOString(),
      path: fileName
    };

  } catch (error) {
    console.error('❌ File upload failed:', error);
    throw error;
  }
};

export const uploadMultipleFiles = async (
  files: File[],
  bucket: string = 'kanban-files',
  folder: string = 'cards',
  onProgress?: (uploaded: number, total: number) => void
): Promise<UploadedFile[]> => {
  const uploadedFiles: UploadedFile[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const uploadedFile = await uploadFileToSupabase(file, bucket, folder);
      uploadedFiles.push(uploadedFile);
      
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`❌ Failed to upload file ${file.name}:`, error);
      throw error;
    }
  }

  return uploadedFiles;
};

// Function to create references to Message files in project Drive folder
export const syncMessageFilesToDrive = async (
  files: UploadedFile[],
  projectId: string
): Promise<void> => {
  if (!files.length || !projectId) return;

  try {
    console.log('📁 Syncing Message files to Drive:', files.length, 'files for project', projectId);
    
    // Get current user for uploaded_by field
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      console.error('❌ User authentication required for Drive sync:', userError);
      return;
    }

    console.log('🚀 Calling sync-message-files Edge Function with service role permissions');
    console.log('👤 User ID:', user.id, 'Email:', user.email);
    
    // Use Edge Function with service role to bypass RLS restrictions
    const { data, error } = await supabase.functions.invoke('sync-message-files', {
      body: {
        files: files,
        projectId: projectId,
        userId: user.id,
        userEmail: user.email
      }
    });

    if (error) {
      console.error('❌ Failed to sync files via Edge Function:', error);
      console.error('Details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('✅ Successfully synced files to Drive project folder via Edge Function:', data);
    console.log('📂 Files are now accessible in project Drive and Messages');
    
  } catch (error) {
    console.error('❌ Error syncing files to Drive:', error);
    // Don't throw - keep Message functionality working even if Drive sync fails
  }
};

// Force download of a file by fetching it as blob
export const forceFileDownload = async (url: string, fileName: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('❌ Failed to download file:', error);
    // Fallback to direct download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const deleteFileFromSupabase = async (
  path: string,
  bucket: string = 'kanban-files'
): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }

    console.log('🗑️ File deleted:', path);
  } catch (error) {
    console.error('❌ File deletion failed:', error);
    throw error;
  }
};