// Robust Rollback System for Knowledge Base Operations
// Implements: "if any checkpoint fails, rollback previous steps"

import { db } from '@/lib/db';
import { deleteFromSupabase } from '@/lib/supabase';

export interface CheckpointData {
  step: 'bucket' | 'database' | 'vector';
  success: boolean;
  data?: any;
  error?: string;
}

export class RobustRollback {
  private operationId: string;
  private checkpoints: CheckpointData[] = [];
  private storageUrls: string[] = [];
  private databaseRecords: Array<{ type: string; id: string }> = [];
  private vectorJobs: Array<{ knowledgeSourceId: string; contentId: string; contentType: string }> = [];

  constructor(operationId: string) {
    this.operationId = operationId;
    console.log(`🔄 [${this.operationId}] Starting operation with rollback protection`);
  }

  // Record successful bucket upload
  recordBucketSuccess(storageUrl: string, bucket: string = 'files') {
    this.storageUrls.push(storageUrl);
    this.checkpoints.push({
      step: 'bucket',
      success: true,
      data: { storageUrl, bucket }
    });
    console.log(`✅ [${this.operationId}] Bucket checkpoint: ${storageUrl}`);
  }

  // Record successful database entry
  recordDatabaseSuccess(recordType: 'file' | 'text' | 'qa' | 'catalog' | 'website', recordId: string) {
    this.databaseRecords.push({ type: recordType, id: recordId });
    this.checkpoints.push({
      step: 'database',
      success: true,
      data: { recordType, recordId }
    });
    console.log(`✅ [${this.operationId}] Database checkpoint: ${recordType}:${recordId}`);
  }

  // Record successful vector processing
  recordVectorSuccess(knowledgeSourceId: string, contentId: string, contentType: string) {
    this.vectorJobs.push({ knowledgeSourceId, contentId, contentType });
    this.checkpoints.push({
      step: 'vector',
      success: true,
      data: { knowledgeSourceId, contentId, contentType }
    });
    console.log(`✅ [${this.operationId}] Vector checkpoint: ${contentType}:${contentId}`);
  }

  // Execute complete rollback
  async executeRollback(reason: string): Promise<void> {
    console.error(`🚨 [${this.operationId}] ROLLBACK INITIATED: ${reason}`);
    
    let rollbackErrors: string[] = [];

    // Step 1: Rollback vector processing (most recent first)
    if (this.vectorJobs.length > 0) {
      console.log(`🔄 [${this.operationId}] Rolling back ${this.vectorJobs.length} vector jobs...`);
      
      for (const vectorJob of this.vectorJobs.reverse()) {
        try {
          await this.cleanupVectorData(vectorJob.knowledgeSourceId, vectorJob.contentId, vectorJob.contentType);
          console.log(`✅ [${this.operationId}] Rolled back vector: ${vectorJob.contentType}:${vectorJob.contentId}`);
        } catch (error) {
          const errorMsg = `Failed to rollback vector ${vectorJob.contentType}:${vectorJob.contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          rollbackErrors.push(errorMsg);
          console.error(`❌ [${this.operationId}] ${errorMsg}`);
        }
      }
    }

    // Step 2: Rollback database records
    if (this.databaseRecords.length > 0) {
      console.log(`🔄 [${this.operationId}] Rolling back ${this.databaseRecords.length} database records...`);
      
      for (const record of this.databaseRecords.reverse()) {
        try {
          await this.deleteDatabaseRecord(record.type, record.id);
          console.log(`✅ [${this.operationId}] Rolled back database: ${record.type}:${record.id}`);
        } catch (error) {
          const errorMsg = `Failed to rollback database ${record.type}:${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          rollbackErrors.push(errorMsg);
          console.error(`❌ [${this.operationId}] ${errorMsg}`);
        }
      }
    }

    // Step 3: Rollback storage files
    if (this.storageUrls.length > 0) {
      console.log(`🔄 [${this.operationId}] Rolling back ${this.storageUrls.length} storage files...`);
      
      for (const storageUrl of this.storageUrls.reverse()) {
        try {
          await this.deleteStorageFile(storageUrl);
          console.log(`✅ [${this.operationId}] Rolled back storage: ${storageUrl}`);
        } catch (error) {
          const errorMsg = `Failed to rollback storage ${storageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          rollbackErrors.push(errorMsg);
          console.error(`❌ [${this.operationId}] ${errorMsg}`);
        }
      }
    }

    if (rollbackErrors.length > 0) {
      console.error(`⚠️ [${this.operationId}] Rollback completed with ${rollbackErrors.length} errors:`, rollbackErrors);
    } else {
      console.log(`✅ [${this.operationId}] Rollback completed successfully`);
    }
  }

  // Clear all checkpoints after successful completion
  clear() {
    this.checkpoints = [];
    this.storageUrls = [];
    this.databaseRecords = [];
    this.vectorJobs = [];
    console.log(`🎉 [${this.operationId}] Operation completed successfully - rollback data cleared`);
  }

  // Private helper methods
  private async cleanupVectorData(knowledgeSourceId: string, contentId: string, contentType: string) {
    // Delete embedding jobs
    await db.$executeRaw`
      DELETE FROM embedding_jobs 
      WHERE knowledge_source_id = ${knowledgeSourceId} 
      AND content_id = ${contentId} 
      AND content_type = ${contentType}
    `;
    
    // Delete vector documents if they exist
    try {
      await db.$executeRaw`
        DELETE FROM vector_documents 
        WHERE knowledge_source_id = ${knowledgeSourceId} 
        AND content_id = ${contentId} 
        AND content_type = ${contentType}
      `;
    } catch (error) {
      // vector_documents table might not exist in all setups
      console.warn(`[${this.operationId}] Could not delete from vector_documents table:`, error);
    }
  }

  private async deleteDatabaseRecord(recordType: string, recordId: string) {
    switch (recordType) {
      case 'file':
        await db.file.delete({ where: { id: recordId } });
        break;
      case 'text':
        await db.textContent.delete({ where: { id: recordId } });
        break;
      case 'qa':
        await db.qAContent.delete({ where: { id: recordId } });
        break;
      case 'catalog':
        await db.catalogContent.delete({ where: { id: recordId } });
        break;
      case 'website':
        await db.websiteContent.delete({ where: { id: recordId } });
        break;
      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }
  }

  private async deleteStorageFile(storageUrl: string) {
    // Try different bucket possibilities
    const buckets = ['files', 'products', 'knowledge'];
    
    for (const bucket of buckets) {
      const success = await deleteFromSupabase(storageUrl, bucket);
      if (success) {
        return; // Successfully deleted
      }
    }
    
    throw new Error(`Failed to delete file from any bucket: ${storageUrl}`);
  }

  // Get operation summary
  getOperationSummary() {
    return {
      operationId: this.operationId,
      checkpoints: this.checkpoints.length,
      storageFiles: this.storageUrls.length,
      databaseRecords: this.databaseRecords.length,
      vectorJobs: this.vectorJobs.length
    };
  }
}

// Factory function to create rollback instances
export function createRollbackHandler(operationType: string): RobustRollback {
  const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return new RobustRollback(operationId);
} 