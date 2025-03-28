import { NextResponse } from 'next/server';
import { Magic } from '@magic-sdk/admin';

// Initialize Magic Admin SDK
const magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const didToken = url.searchParams.get('didToken');

    if (!didToken) {
      return NextResponse.redirect(new URL('/login?error=no_token', request.url));
    }

    // Verify the DID token with Magic Admin SDK
    try {
      await magicAdmin.token.validate(didToken);
      
      // Return a success page that can be closed
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Login Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f9fafb;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              h1 {
                color: #1a1a1a;
                margin-bottom: 1rem;
              }
              p {
                color: #4b5563;
                margin-bottom: 1.5rem;
              }
              .success-icon {
                color: #10b981;
                font-size: 3rem;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✓</div>
              <h1>Login Successful!</h1>
              <p>You can now close this window and return to the login page.</p>
              <p>The page will automatically refresh and log you in.</p>
            </div>
          </body>
        </html>
        `,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    } catch (error) {
      console.error('Token validation error:', error);
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }
  } catch (error) {
    console.error('Magic callback error:', error);
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url));
  }
} 