import { NextApiRequest, NextApiResponse } from 'next';
import { Formidable, Fields, Files } from 'formidable';
import fs from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadToSupabase, deleteFromSupabase } from '@/lib/supabase';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false, // Disable response size limit
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = session.user.id;

  try {
    // Create formidable instance with proper config
    const form = new Formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB
      keepExtensions: true,
      multiples: false,
      allowEmptyFiles: false,
    });

    // Parse the form with a callback approach (more reliable)
    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });

    // Log what we received for debugging
    console.log("Form data received:", {
      fields: Object.keys(fields),
      files: Object.keys(files),
      logo: files.logo ? "File present" : "No logo file"
    });

    // Extract fields
    const agentId = fields.agentId ? 
      (Array.isArray(fields.agentId) ? fields.agentId[0] : fields.agentId) : 
      null;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Valid Agent ID is required.' });
    }

    // Handle files - important: files.logo might be an array
    const logoFile = files.logo ? 
      (Array.isArray(files.logo) ? files.logo[0] : files.logo) : 
      null;
    
    if (!logoFile || !logoFile.filepath) {
      return res.status(400).json({ error: 'No logo file provided or invalid file.' });
    }

    // Log file details
    console.log("File details:", {
      originalFilename: logoFile.originalFilename,
      filepath: logoFile.filepath,
      mimetype: logoFile.mimetype,
      size: logoFile.size
    });

    // Verify ownership
    const agent = await prisma.chatbot.findUnique({
      where: { id: agentId },
      select: { userId: true, chatbotLogoURL: true },
    });

    if (!agent || agent.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden. You do not own this agent.' });
    }

    // Accept common image types both by mimetype and extension
    const validImageTypes = [
      'image/jpeg', 
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp', 
      'image/svg+xml'
    ];

    // Get file extension
    const fileExtension = logoFile.originalFilename ? 
      logoFile.originalFilename.toLowerCase().split('.').pop() : 
      null;
    
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    // Determine mimetype - either from file or infer from extension
    let fileMimetype = logoFile.mimetype || null;
    
    // If mime type is missing but we have a valid extension, infer the mime type
    if (!fileMimetype && fileExtension) {
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
      };
      fileMimetype = mimeMap[fileExtension] || null;
    }
    
    // Validate file type by mimetype or extension
    const validMimetype = fileMimetype && validImageTypes.includes(fileMimetype);
    const validExtension = fileExtension && validExtensions.includes(fileExtension);
    
    if (!validMimetype && !validExtension) {
      console.log("Invalid file type:", { fileMimetype, fileExtension });
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload a JPEG/JPG, PNG, GIF, SVG, or WebP image.',
        details: {
          detectedMimetype: fileMimetype,
          detectedExtension: fileExtension
        }
      });
    }

    // Delete old logo if exists
    if (agent.chatbotLogoURL) {
      try {
        const urlParts = agent.chatbotLogoURL.split(`/agent-logos/`);
        const oldPath = urlParts.length > 1 ? urlParts[1] : null;
        if (oldPath) {
          await deleteFromSupabase(oldPath, 'agent-logos');
        }
      } catch (e) {
        console.warn('Error deleting old logo URL:', e);
      }
    }

    // Read file
    const fileBuffer = fs.readFileSync(logoFile.filepath);
    
    // Use best available mimetype or default to image/jpeg
    const uploadMimetype = fileMimetype || 'image/jpeg';
    
    // Upload to Supabase
    const uploadResult = await uploadToSupabase(
      new Blob([fileBuffer], { type: uploadMimetype }),
      'agent-logos',
      agentId,
      userId,
      logoFile.originalFilename || `logo.${fileExtension || 'jpg'}`
    );

    if (!uploadResult) {
      return res.status(500).json({ error: 'Failed to upload logo.' });
    }

    // Clean up temp file
    try {
      fs.unlinkSync(logoFile.filepath);
    } catch (e) {
      console.warn('Failed to clean up temp file:', e);
    }

    // Return the URL
    return res.status(200).json({ 
      message: 'Logo uploaded successfully', 
      logoUrl: uploadResult.url,
      filePathInBucket: uploadResult.path
    });

  } catch (error: any) {
    console.error('Error processing logo upload:', error);
    return res.status(500).json({ 
      error: 'Internal server error during upload.', 
      details: error.message 
    });
  }
} 