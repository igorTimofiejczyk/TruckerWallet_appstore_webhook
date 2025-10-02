// app/api/apple-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const APPWRITE_FUNCTION_URL = process.env.APPWRITE_FUNCTION_URL!;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;

export async function POST(request: NextRequest) {
  console.log('📱 Webhook received');

  try {
    const body = await request.text();
    
    const pathname = request.nextUrl.pathname;
    const endpoint = pathname.replace('/api/apple-webhook', '') || '/webhook';

    const appwriteResponse = await fetch(
      `${APPWRITE_FUNCTION_URL}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        },
        body: body,
      }
    );

    const responseData = await appwriteResponse.text();
    
    return new NextResponse(responseData, {
      status: appwriteResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'TruckerWallet Webhook',
    timestamp: new Date().toISOString(),
  });
}