import { ReactNode } from 'react';

// Define the base types needed for Artifact
export interface ArtifactConfig<K extends string, M> {
  kind: K;
  description: string;
  onStreamPart?: (params: { 
    streamPart: any; 
    setArtifact: (updater: (draft: any) => any) => void;
  }) => void;
  content: any;
  actions: Array<{
    icon: ReactNode;
    description: string;
    onClick: (params: any) => void;
    isDisabled?: (params: any) => boolean;
  }>;
  toolbar: any[];
  initialize?: (params: { 
    documentId: string; 
    setMetadata: (updater: any) => void;
  }) => void;
}

// Create the Artifact class
export class ArtifactBase<K extends string, M> {
  kind: K;
  description: string;
  onStreamPart?: (params: { 
    streamPart: any; 
    setArtifact: (updater: (draft: any) => any) => void;
  }) => void;
  content: any;
  actions: Array<{
    icon: ReactNode;
    description: string;
    onClick: (params: any) => void;
    isDisabled?: (params: any) => boolean;
  }>;
  toolbar: any[];
  initialize?: (params: { 
    documentId: string; 
    setMetadata: (updater: any) => void;
  }) => void;

  constructor(config: ArtifactConfig<K, M>) {
    this.kind = config.kind;
    this.description = config.description;
    this.onStreamPart = config.onStreamPart;
    this.content = config.content;
    this.actions = config.actions;
    this.toolbar = config.toolbar;
    this.initialize = config.initialize;
  }
}
