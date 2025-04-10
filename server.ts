import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
// import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
// import cookie from 'cookie'; // No longer needed
// import { getToken } from 'next-auth/jwt'; // No longer needed

// Load environment variables from .env file
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Keep OpenAI API Key check for the token endpoint
if (!process.env.OPENAI_API_KEY) { 
    console.error("FATAL ERROR: OPENAI_API_KEY environment variable is not set.");
    process.exit(1); 
}
// const openaiApiKey = process.env.OPENAI_API_KEY; // No longer needed directly here

// Helper function to generate a very short silent audio sample 
// to initialize streaming (500ms of silence @ 16kHz)
function generateSilentPCMAudio(durationMs = 500, sampleRate = 16000) {
    // Calculate number of samples
    const numSamples = Math.floor(durationMs * sampleRate / 1000);
    
    // Create a buffer of zeros (silence)
    const buffer = new Int16Array(numSamples);
    
    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(buffer.buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary, 'binary').toString('base64');
}

// No longer need NEXTAUTH_SECRET check for WebSocket
/*
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
     console.error("FATAL ERROR: NEXTAUTH_SECRET is not set. WebSocket authentication cannot work.");
     process.exit(1);
}
*/

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            // Let Next.js handle all requests, including API routes like /api/token
            handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // --- Remove WebSocket Server Setup --- 
    /*
    const wss = new WebSocketServer({ 
        server: httpServer, 
        path: '/ws/realtime'
     });

    console.log(`WebSocket server listening on ws://${hostname}:${port}/ws/realtime`);

    wss.on('connection', async (clientWs, req: IncomingMessage) => { 
       // ... All WebSocket proxy logic removed ...
    });
    */
   // --- End of WebSocket Removal ---

    httpServer
        .once('error', (err) => {
            console.error('HTTP Server Error:', err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });

}).catch(err => {
     console.error('Next.js App Preparation Error:', err);
     process.exit(1);
}); 