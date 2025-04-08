// Define the OpenAIFile type
interface OpenAIFile {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
  status: string;
  status_details?: string;
}

export const uploadFileToOpenAI = async (
  file: Blob | string,
  fileName: string,
  purpose: "assistants" | "vision" = "assistants"
): Promise<OpenAIFile> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is missing");
  }

  try {
    const formData = new FormData();
    
    if (typeof file === "string") {
      // Convert string to blob
      const fileBlob = new Blob([file], { type: "text/plain" });
      formData.append("file", fileBlob, fileName);
    } else {
      formData.append("file", file, fileName);
    }
    
    formData.append("purpose", purpose);
    
    // Add special handling based on file type
    const fileNameLower = fileName.toLowerCase();
    const isStructuredData = fileNameLower.endsWith('.csv') || 
                            fileNameLower.endsWith('.xlsx') || 
                            fileNameLower.endsWith('.pdf');
                            
    if (isStructuredData) {
      // Add metadata to help OpenAI understand this file better
      formData.append("purpose_details", JSON.stringify({
        type: "catalog_data",
        structured: true,
        format: fileNameLower.endsWith('.csv') ? "csv" : 
                fileNameLower.endsWith('.xlsx') ? "excel" : "pdf"
      }));
    }
    
    const response = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload file to OpenAI: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading file to OpenAI:", error);
    throw error;
  }
}; 