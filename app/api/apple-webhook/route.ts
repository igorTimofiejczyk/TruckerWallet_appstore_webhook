// app/api/apple-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const APPWRITE_FUNCTION_URL = process.env.APPWRITE_FUNCTION_URL!;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Получаем тело запроса как текст
    const rawBody = await request.text();

    // Логируем для дебага
    console.log('📥 Incoming webhook request: ', request.method, request.url);
    console.log('🔹 Raw request body:', rawBody);

    // Пробрасываем в Appwrite Function
    const appwriteResponse = await fetch(`${APPWRITE_FUNCTION_URL}/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
      // Appwrite ожидает строку в поле `data`
      body: JSON.stringify({
        data: rawBody,  // пробрасываем JSON как строку
        path: '/webhook', // нужный endpoint в функции
      }),
    });

    const responseText = await appwriteResponse.text();
    console.log('📩 Appwrite raw response:', responseText);

    return new NextResponse(responseText, {
      status: appwriteResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Vercel proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Apple Webhook Proxy',
    timestamp: new Date().toISOString(),
  });
}
