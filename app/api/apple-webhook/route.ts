// app/api/apple-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;
const APPWRITE_FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID!;

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Incoming webhook (Vercel)');

    const raw = await request.text();
    console.log('🔹 Raw body from Apple:', raw);

    // Forward to Appwrite: POST /v1/functions/{functionId}/executions
    const appwriteUrl = `${APPWRITE_ENDPOINT}/functions/${APPWRITE_FUNCTION_ID}/executions`;

    // Build request payload for Appwrite Cloud. Use "body" field (string),
    // and set "path" to "/webhook" so context.req.path === "/webhook" in your function.
    const appwritePayload = {
      body: raw ?? '',
      path: '/webhook',
      method: 'POST',
      // headers can be provided as an object (Appwrite expects a map)
      headers: {
        'content-type': 'application/json'
      }
    };

    console.log('📦 Appwrite payload:', appwritePayload);

    const resp = await fetch(appwriteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
        // optional: request a specific response format/version
        'X-Appwrite-Response-Format': '1.8.0'
      },
      body: JSON.stringify(appwritePayload)
    });

    const text = await resp.text();
    console.log('📩 Appwrite response status:', resp.status);
    console.log('📩 Appwrite response body:', text);

    // Return Appwrite response downstream (or you can mask/transform)
    try {
      const json = text ? JSON.parse(text) : null;
      return NextResponse.json(json, { status: resp.status });
    } catch {
      return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': 'application/json' }});
    }

  } catch (err: any) {
    console.error('❌ Proxy error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
