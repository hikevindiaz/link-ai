import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { sourceId: string; contentId: string } }
) {
  // DISABLED: This route is creating duplicate jobs and is no longer needed
  // The main upload route (app/api/knowledge-sources/[sourceId]/content/route.ts) 
  // now handles the complete flow including embedding job creation
  console.log(`[CHUNKED-UPLOAD] Route disabled to prevent duplicates. sourceId: ${params.sourceId}, contentId: ${params.contentId}`);
  
  return NextResponse.json({
    success: true,
    message: "Chunked upload route disabled - processing handled by main upload route",
    disabled: true,
    redirect: "Use the main /content route for file uploads"
  }, { status: 200 });
} 