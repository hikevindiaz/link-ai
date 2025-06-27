// This endpoint is deprecated - vector processing now happens automatically
// when content is added through the main content APIs

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ 
    message: "Vector processing now happens automatically when content is added",
    deprecated: true
  }, { status: 200 });
} 