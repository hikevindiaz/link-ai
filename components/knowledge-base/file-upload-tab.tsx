'use client'

import FileUploadTab from './file-upload-tab/index';
import { Source } from './file-upload-tab/types';

interface FileUploadTabWrapperProps {
  source?: Source;
}

export default function FileUploadTabWrapper({ source }: FileUploadTabWrapperProps) {
  return <FileUploadTab source={source} />;
}