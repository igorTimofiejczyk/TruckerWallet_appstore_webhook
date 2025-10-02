// app/api/apple-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const APPWRITE_FUNCTION_URL = process.env.APPWRITE_FUNCTION_URL!;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;

export async function POST(request: NextRequest) {
  console.log('📥 Incoming webhook request:', request.method, request.url);

  try {
    const body = await request.text();
    console.log('🔹 Raw request body:', body);

    // Отправляем запрос в Appwrite Function
    const appwriteResponse = await fetch(`${APPWRITE_FUNCTION_URL}/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
      body: JSON.stringify({
        path: '/webhook',   // путь в вашей функции Appwrite
        data: body          // строка тела запроса от Apple
      }),
    });

    const responseData = await appwriteResponse.text();
    console.log('📩 Appwrite raw response:', responseData);

    return new NextResponse(responseData, {
      status: appwriteResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error forwarding webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'TruckerWallet Apple Webhook',
    timestamp: new Date().toISOString(),
  });
}
