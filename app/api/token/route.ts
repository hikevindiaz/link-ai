import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
        console.error("OPENAI_API_KEY environment variable is not set.");
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        // Extract desired model and voice from the request body (optional)
        const body = await request.json().catch(() => ({})); // Handle cases with no body
        const model = body.model || 'gpt-4o-mini-realtime-preview-2024-12-17'; // Revert to specific preview model
        const voice = body.voice || 'alloy'; // Default voice

        console.log(`Requesting ephemeral token for model: ${model}, voice: ${voice}`);

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: model,
                voice: voice,
                // Add other initial session config here if needed
                // Example: Default VAD settings
                turn_detection: {
                    type: 'server_vad', // Using server VAD as a default for WebRTC
                }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenAI API Error getting token:', data);
            return NextResponse.json({ error: 'Failed to generate token', details: data }, { status: response.status });
        }

        // Return the entire session object which includes the client_secret
        console.log("Ephemeral token generated successfully.");
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Token generation error:", error);
        return NextResponse.json({ error: 'Failed to generate token', details: error.message }, { status: 500 });
    }
}

// Optional: Add a GET handler for simple testing or info
export async function GET() {
    return NextResponse.json({ message: "Realtime token endpoint: Use POST to generate a token." });
}
