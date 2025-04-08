export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Define table interfaces here based on your Prisma schema
      users: {
        Row: {
          id: string
          name: string | null
          email: string | null
          emailVerified: string | null
          image: string | null
          createdAt: string
          addressLine1: string | null
          addressLine2: string | null
          city: string | null
          state: string | null
          postalCode: string | null
          country: string | null
          companyName: string | null
          companySize: string | null
          businessWebsite: string | null
          industryType: string | null
          businessTasks: string[] | null
          communicationChannels: string[] | null
        }
        Insert: {
          id?: string
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          createdAt?: string
          addressLine1?: string | null
          addressLine2?: string | null
          city?: string | null
          state?: string | null
          postalCode?: string | null
          country?: string | null
          companyName?: string | null
          companySize?: string | null
          businessWebsite?: string | null
          industryType?: string | null
          businessTasks?: string[] | null
          communicationChannels?: string[] | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          createdAt?: string
          addressLine1?: string | null
          addressLine2?: string | null
          city?: string | null
          state?: string | null
          postalCode?: string | null
          country?: string | null
          companyName?: string | null
          companySize?: string | null
          businessWebsite?: string | null
          industryType?: string | null
          businessTasks?: string[] | null
          communicationChannels?: string[] | null
        }
        Relationships: []
      }
      files: {
        Row: {
          id: string
          userId: string
          name: string
          openAIFileId: string
          createdAt: string
          blobUrl: string
          storageUrl: string | null
          storageProvider: string
          crawlerId: string | null
          knowledgeSourceId: string | null
        }
        Insert: {
          id?: string
          userId: string
          name: string
          openAIFileId: string
          createdAt?: string
          blobUrl: string
          storageUrl?: string | null
          storageProvider?: string
          crawlerId?: string | null
          knowledgeSourceId?: string | null
        }
        Update: {
          id?: string
          userId?: string
          name?: string
          openAIFileId?: string
          createdAt?: string
          blobUrl?: string
          storageUrl?: string | null
          storageProvider?: string
          crawlerId?: string | null
          knowledgeSourceId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_userId_fkey"
            columns: ["userId"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chatbots: {
        Row: {
          id: string
          name: string
          userId: string
          openaiId: string | null
          createdAt: string
          openaiKey: string | null
          modelId: string | null
          prompt: string | null
          welcomeMessage: string | null
          chatbotErrorMessage: string | null
          // Add other fields based on your Prisma schema
        }
        Insert: {
          id?: string
          name: string
          userId: string
          openaiId?: string | null
          createdAt?: string
          openaiKey?: string | null
          modelId?: string | null
          prompt?: string | null
          welcomeMessage?: string | null
          chatbotErrorMessage?: string | null
        }
        Update: {
          id?: string
          name?: string
          userId?: string
          openaiId?: string | null
          createdAt?: string
          openaiKey?: string | null
          modelId?: string | null
          prompt?: string | null
          welcomeMessage?: string | null
          chatbotErrorMessage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbots_userId_fkey"
            columns: ["userId"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sync_schema_from_prisma: {
        Args: Record<string, unknown>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 