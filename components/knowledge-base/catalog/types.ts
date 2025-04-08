// Type definitions for catalog components

import { Source } from '../source-sidebar';

// Define catalog mode type
export type CatalogMode = 'manual';

export interface Product {
  id: string;
  title: string;
  price: number;
  taxRate: number;
  description: string;
  categories: string[];
  imageUrl?: string; // URL for product image
}

export interface CatalogContent {
  id: string;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
  knowledgeSourceId: string;
  // Keeping minimal file references for API compatibility
  fileId?: string;
  file?: {
    id: string;
    name: string;
    blobUrl?: string;
  };
  products?: Product[];
}

export interface CatalogTabProps {
  source?: Source;
  onSave: (data: any) => Promise<void>;
} 