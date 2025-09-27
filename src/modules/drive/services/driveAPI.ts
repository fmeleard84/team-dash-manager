/**
 * Service API centralisé pour le module DRIVE
 * Toute la logique d'interaction avec Supabase pour la gestion des fichiers
 * Utilisé par les hooks React pour éviter les appels directs dans les composants
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Drive,
  DriveNode,
  DriveUpload,
  DriveShare,
  DriveActivity,
  DriveStats,
  DriveFilters,
  DriveSearchResult,
  CreateDriveData,
  UpdateDriveData,
  CreateFolderData,
  UpdateNodeData,
  UploadFileData,
  ShareNodeData,
  DriveIntegration,
  DriveNotification
} from '../types';

export class DriveAPI {
  /**
   * Récupère tous les drives d'un projet
   */
  static async getProjectDrives(projectId: string): Promise<Drive[]> {
    try {
      const { data, error } = await supabase
        .from('project_drives')
        .select(`
          *,
          drive_nodes!project_drives_id_fkey(count),
          drive_stats:drive_id(*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[DriveAPI] Error fetching project drives:', error);
      throw error;
    }
  }

  /**
   * Récupère un drive complet avec ses nœuds
   */
  static async getDriveById(driveId: string, parentId: string | null = null): Promise<{
    drive: Drive;
    nodes: DriveNode[];
  }> {
    try {
      // Récupérer le drive
      const { data: driveData, error: driveError } = await supabase
        .from('project_drives')
        .select('*')
        .eq('id', driveId)
        .single();

      if (driveError) throw driveError;

      // Récupérer les nœuds du niveau demandé
      const { data: nodesData, error: nodesError } = await supabase
        .from('drive_nodes')
        .select(`
          *,
          created_by_profile:created_by(first_name, last_name, email),
          last_modified_by_profile:last_modified_by(first_name, last_name, email),
          drive_node_metadata(*),
          drive_permissions(*),
          children:drive_nodes!parent_id(id, name, type, size_bytes, created_at)
        `)
        .eq('drive_id', driveId)
        .eq('parent_id', parentId)
        .eq('is_deleted', false)
        .order('type', { ascending: false }) // Dossiers en premier
        .order('name', { ascending: true });

      if (nodesError) throw nodesError;

      return {
        drive: driveData,
        nodes: nodesData || []
      };
    } catch (error) {
      console.error('[DriveAPI] Error fetching drive by ID:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau drive
   */
  static async createDrive(driveData: CreateDriveData & { project_id: string }): Promise<Drive> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const newDrive = {
        ...driveData,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        storage_used_bytes: 0,
        is_public: false
      };

      const { data, error } = await supabase
        .from('project_drives')
        .insert([newDrive])
        .select()
        .single();

      if (error) throw error;

      // Créer le dossier racine
      await this.createFolder({
        name: 'Root',
        parent_id: null,
        drive_id: data.id,
        description: 'Dossier racine du drive'
      });

      return data;
    } catch (error) {
      console.error('[DriveAPI] Error creating drive:', error);
      throw error;
    }
  }

  /**
   * Met à jour un drive
   */
  static async updateDrive(driveId: string, updateData: UpdateDriveData): Promise<Drive> {
    try {
      const { data, error } = await supabase
        .from('project_drives')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', driveId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[DriveAPI] Error updating drive:', error);
      throw error;
    }
  }

  /**
   * Supprime un drive (soft delete)
   */
  static async deleteDrive(driveId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_drives')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', driveId);

      if (error) throw error;

      // Marquer tous les nœuds comme supprimés
      await supabase
        .from('drive_nodes')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('drive_id', driveId);

    } catch (error) {
      console.error('[DriveAPI] Error deleting drive:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau dossier
   */
  static async createFolder(folderData: CreateFolderData): Promise<DriveNode> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const newFolder = {
        name: folderData.name,
        type: 'folder' as const,
        parent_id: folderData.parent_id,
        drive_id: folderData.drive_id,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        is_starred: false,
        is_shared: false,
        version: 1
      };

      const { data, error } = await supabase
        .from('drive_nodes')
        .insert([newFolder])
        .select()
        .single();

      if (error) throw error;

      // Créer les métadonnées si fournies
      if (folderData.description || folderData.tags) {
        await this.updateNodeMetadata(data.id, {
          description: folderData.description,
          tags: folderData.tags || []
        });
      }

      // Logger l'activité
      await this.logActivity(folderData.drive_id, 'create_folder', user.id, data.id, {
        folder_name: folderData.name
      });

      return data;
    } catch (error) {
      console.error('[DriveAPI] Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Met à jour un nœud (fichier ou dossier)
   */
  static async updateNode(nodeId: string, updateData: UpdateNodeData): Promise<DriveNode> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data, error } = await supabase
        .from('drive_nodes')
        .update({
          ...updateData,
          last_modified_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', nodeId)
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour les métadonnées si nécessaire
      if (updateData.description || updateData.tags) {
        await this.updateNodeMetadata(nodeId, {
          description: updateData.description,
          tags: updateData.tags
        });
      }

      // Logger l'activité si renommage
      if (updateData.name) {
        await this.logActivity(data.drive_id, 'rename', user.id, nodeId, {
          new_name: updateData.name
        });
      }

      return data;
    } catch (error) {
      console.error('[DriveAPI] Error updating node:', error);
      throw error;
    }
  }

  /**
   * Déplace un nœud vers un autre dossier
   */
  static async moveNode(nodeId: string, newParentId: string | null): Promise<DriveNode> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer l'ancien parent pour l'activité
      const { data: nodeData } = await supabase
        .from('drive_nodes')
        .select('parent_id, drive_id, name')
        .eq('id', nodeId)
        .single();

      const { data, error } = await supabase
        .from('drive_nodes')
        .update({
          parent_id: newParentId,
          last_modified_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', nodeId)
        .select()
        .single();

      if (error) throw error;

      // Logger l'activité
      if (nodeData) {
        await this.logActivity(nodeData.drive_id, 'move', user.id, nodeId, {
          file_name: nodeData.name,
          old_parent_id: nodeData.parent_id,
          new_parent_id: newParentId
        });
      }

      return data;
    } catch (error) {
      console.error('[DriveAPI] Error moving node:', error);
      throw error;
    }
  }

  /**
   * Supprime un nœud (soft delete)
   */
  static async deleteNode(nodeId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer les infos du nœud pour l'activité
      const { data: nodeData } = await supabase
        .from('drive_nodes')
        .select('drive_id, name, type')
        .eq('id', nodeId)
        .single();

      const { error } = await supabase
        .from('drive_nodes')
        .update({
          is_deleted: true,
          last_modified_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', nodeId);

      if (error) throw error;

      // Logger l'activité
      if (nodeData) {
        await this.logActivity(nodeData.drive_id, 'delete', user.id, nodeId, {
          file_name: nodeData.name,
          file_type: nodeData.type
        });
      }
    } catch (error) {
      console.error('[DriveAPI] Error deleting node:', error);
      throw error;
    }
  }

  /**
   * Upload d'un fichier avec support des chunks
   */
  static async uploadFile(fileData: UploadFileData): Promise<{ upload: DriveUpload; node?: DriveNode }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { file, parent_id, drive_id, description, tags, chunk_size = 1024 * 1024 } = fileData;

      // Créer l'enregistrement d'upload
      const uploadSessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const chunksTotal = Math.ceil(file.size / chunk_size);

      const uploadRecord = {
        drive_id,
        parent_id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        upload_status: 'pending' as const,
        upload_progress: 0,
        chunk_size,
        chunks_total: chunksTotal,
        chunks_uploaded: 0,
        upload_session_id: uploadSessionId,
        created_at: new Date().toISOString()
      };

      const { data: uploadData, error: uploadError } = await supabase
        .from('drive_uploads')
        .insert([uploadRecord])
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Uploader le fichier vers le storage
      const filePath = `drives/${drive_id}/${parent_id || 'root'}/${uploadSessionId}_${file.name}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (storageError) throw storageError;

      // Créer le nœud de fichier
      const newNode = {
        name: file.name,
        type: 'file' as const,
        parent_id,
        drive_id,
        size_bytes: file.size,
        mime_type: file.type,
        file_extension: file.name.split('.').pop()?.toLowerCase() || '',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        is_starred: false,
        is_shared: false,
        version: 1,
        checksum: await this.calculateFileChecksum(file)
      };

      const { data: nodeData, error: nodeError } = await supabase
        .from('drive_nodes')
        .insert([newNode])
        .select()
        .single();

      if (nodeError) throw nodeError;

      // Mettre à jour l'upload avec le node_id
      const { data: finalUpload, error: updateError } = await supabase
        .from('drive_uploads')
        .update({
          node_id: nodeData.id,
          upload_status: 'completed',
          upload_progress: 100,
          chunks_uploaded: chunksTotal,
          completed_at: new Date().toISOString()
        })
        .eq('id', uploadData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Créer les métadonnées si fournies
      if (description || tags) {
        await this.updateNodeMetadata(nodeData.id, {
          description,
          tags: tags || []
        });
      }

      // Générer une vignette si c'est une image
      if (fileData.generate_thumbnail && file.type.startsWith('image/')) {
        await this.generateThumbnail(nodeData.id, filePath);
      }

      // Logger l'activité
      await this.logActivity(drive_id, 'upload', user.id, nodeData.id, {
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      });

      return {
        upload: finalUpload,
        node: nodeData
      };
    } catch (error) {
      console.error('[DriveAPI] Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Télécharge un fichier
   */
  static async downloadFile(nodeId: string): Promise<{ url: string; filename: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer les infos du fichier
      const { data: nodeData, error: nodeError } = await supabase
        .from('drive_nodes')
        .select('name, drive_id, storage_path, mime_type')
        .eq('id', nodeId)
        .eq('type', 'file')
        .single();

      if (nodeError) throw nodeError;

      // Construire le chemin du fichier
      const filePath = nodeData.storage_path || `drives/${nodeData.drive_id}/${nodeId}_${nodeData.name}`;

      // Générer une URL de téléchargement signée
      const { data: urlData, error: urlError } = await supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, 3600); // Valide 1 heure

      if (urlError) throw urlError;

      // Logger l'activité
      await this.logActivity(nodeData.drive_id, 'download', user.id, nodeId, {
        file_name: nodeData.name
      });

      return {
        url: urlData.signedUrl,
        filename: nodeData.name
      };
    } catch (error) {
      console.error('[DriveAPI] Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Partage un nœud
   */
  static async shareNode(shareData: ShareNodeData): Promise<DriveShare> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const newShare = {
        ...shareData,
        created_by: user.id,
        created_at: new Date().toISOString(),
        access_token: shareData.shared_with_type === 'link' ? this.generateAccessToken() : null,
        password_protected: !!shareData.password,
        download_count: 0
      };

      const { data, error } = await supabase
        .from('drive_shares')
        .insert([newShare])
        .select()
        .single();

      if (error) throw error;

      // Marquer le nœud comme partagé
      await supabase
        .from('drive_nodes')
        .update({ is_shared: true })
        .eq('id', shareData.node_id);

      // Logger l'activité
      const { data: nodeData } = await supabase
        .from('drive_nodes')
        .select('drive_id, name')
        .eq('id', shareData.node_id)
        .single();

      if (nodeData) {
        await this.logActivity(nodeData.drive_id, 'share', user.id, shareData.node_id, {
          file_name: nodeData.name,
          shared_with_type: shareData.shared_with_type,
          shared_with_id: shareData.shared_with_id
        });
      }

      return data;
    } catch (error) {
      console.error('[DriveAPI] Error sharing node:', error);
      throw error;
    }
  }

  /**
   * Recherche de fichiers
   */
  static async searchFiles(driveId: string, query: string, filters?: DriveFilters): Promise<DriveSearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('drive_nodes')
        .select(`
          *,
          created_by_profile:created_by(first_name, last_name),
          drive_node_metadata(*)
        `)
        .eq('drive_id', driveId)
        .eq('is_deleted', false)
        .textSearch('name', query);

      // Appliquer les filtres
      if (filters) {
        if (filters.node_type) queryBuilder = queryBuilder.eq('type', filters.node_type);
        if (filters.mime_type) queryBuilder = queryBuilder.eq('mime_type', filters.mime_type);
        if (filters.file_extension) queryBuilder = queryBuilder.eq('file_extension', filters.file_extension);
        if (filters.created_by) queryBuilder = queryBuilder.eq('created_by', filters.created_by);
        if (filters.date_from) queryBuilder = queryBuilder.gte('created_at', filters.date_from);
        if (filters.date_to) queryBuilder = queryBuilder.lte('created_at', filters.date_to);
        if (filters.size_min) queryBuilder = queryBuilder.gte('size_bytes', filters.size_min);
        if (filters.size_max) queryBuilder = queryBuilder.lte('size_bytes', filters.size_max);
        if (filters.is_starred !== undefined) queryBuilder = queryBuilder.eq('is_starred', filters.is_starred);
        if (filters.is_shared !== undefined) queryBuilder = queryBuilder.eq('is_shared', filters.is_shared);
      }

      const { data, error } = await queryBuilder
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transformer en résultats de recherche avec score de pertinence
      return (data || []).map(node => ({
        node,
        relevance_score: this.calculateRelevanceScore(node.name, query),
        matched_fields: this.getMatchedFields(node, query),
        preview_snippet: this.generatePreviewSnippet(node, query)
      })).sort((a, b) => b.relevance_score - a.relevance_score);
    } catch (error) {
      console.error('[DriveAPI] Error searching files:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques d'un drive
   */
  static async getDriveStats(driveId: string): Promise<DriveStats> {
    try {
      const { data, error } = await supabase.rpc('get_drive_stats', {
        p_drive_id: driveId
      });

      if (error) throw error;
      return data || {
        total_files: 0,
        total_folders: 0,
        total_size_bytes: 0,
        files_by_type: {},
        storage_usage_percent: 0,
        recent_uploads: 0,
        recent_downloads: 0,
        shared_items: 0,
        starred_items: 0,
        active_uploads: 0,
        quota_remaining_bytes: 0
      };
    } catch (error) {
      console.error('[DriveAPI] Error fetching drive stats:', error);
      throw error;
    }
  }

  /**
   * Récupère l'activité d'un drive
   */
  static async getDriveActivity(driveId: string, limit: number = 20): Promise<DriveActivity[]> {
    try {
      const { data, error } = await supabase
        .from('drive_activities')
        .select(`
          *,
          user_profile:user_id(first_name, last_name, email)
        `)
        .eq('drive_id', driveId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[DriveAPI] Error fetching drive activity:', error);
      throw error;
    }
  }

  // ========================
  // MÉTHODES UTILITAIRES
  // ========================

  /**
   * Met à jour les métadonnées d'un nœud
   */
  private static async updateNodeMetadata(nodeId: string, metadata: any): Promise<void> {
    const { error } = await supabase
      .from('drive_node_metadata')
      .upsert({
        node_id: nodeId,
        ...metadata,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Enregistre une activité
   */
  private static async logActivity(
    driveId: string,
    action: DriveActivity['action'],
    userId: string,
    nodeId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Récupérer le nom de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Utilisateur';

      await supabase
        .from('drive_activities')
        .insert([{
          drive_id: driveId,
          node_id: nodeId,
          action,
          user_id: userId,
          user_name: userName,
          created_at: new Date().toISOString(),
          metadata: metadata || {}
        }]);
    } catch (error) {
      // Ne pas faire échouer l'opération principale si le logging échoue
      console.warn('[DriveAPI] Failed to log activity:', error);
    }
  }

  /**
   * Génère un token d'accès pour les liens publics
   */
  private static generateAccessToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Calcule le checksum d'un fichier
   */
  private static async calculateFileChecksum(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('[DriveAPI] Failed to calculate checksum:', error);
      return `checksum_${Date.now()}`;
    }
  }

  /**
   * Génère une vignette pour une image
   */
  private static async generateThumbnail(nodeId: string, filePath: string): Promise<void> {
    try {
      // TODO: Implémenter la génération de vignettes
      // Peut utiliser une Edge Function pour redimensionner l'image
      console.log(`[DriveAPI] Generating thumbnail for ${nodeId} at ${filePath}`);
    } catch (error) {
      console.warn('[DriveAPI] Failed to generate thumbnail:', error);
    }
  }

  /**
   * Calcule un score de pertinence pour la recherche
   */
  private static calculateRelevanceScore(filename: string, query: string): number {
    const lowerFilename = filename.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerFilename.includes(lowerQuery)) {
      if (lowerFilename.startsWith(lowerQuery)) return 100;
      if (lowerFilename.endsWith(lowerQuery)) return 90;
      return 80;
    }

    // Score basé sur le nombre de mots correspondants
    const fileWords = lowerFilename.split(/[^a-z0-9]+/);
    const queryWords = lowerQuery.split(/[^a-z0-9]+/);
    const matches = queryWords.filter(qw => fileWords.some(fw => fw.includes(qw)));

    return Math.floor((matches.length / queryWords.length) * 60);
  }

  /**
   * Identifie les champs qui correspondent à la recherche
   */
  private static getMatchedFields(node: DriveNode, query: string): string[] {
    const fields: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (node.name.toLowerCase().includes(lowerQuery)) {
      fields.push('name');
    }

    if (node.metadata?.description?.toLowerCase().includes(lowerQuery)) {
      fields.push('description');
    }

    if (node.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      fields.push('tags');
    }

    return fields;
  }

  /**
   * Génère un aperçu pour les résultats de recherche
   */
  private static generatePreviewSnippet(node: DriveNode, query: string): string | undefined {
    if (node.metadata?.description) {
      const desc = node.metadata.description;
      const index = desc.toLowerCase().indexOf(query.toLowerCase());
      if (index >= 0) {
        const start = Math.max(0, index - 30);
        const end = Math.min(desc.length, index + query.length + 30);
        return desc.substring(start, end) + (end < desc.length ? '...' : '');
      }
    }
    return undefined;
  }
}