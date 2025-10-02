// app/api/apple-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;
const APPWRITE_FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID!;

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Incoming webhook request:', request.method, request.url);

    // Получаем тело запроса (Apple всегда шлёт JSON)
    const raw = await request.text();
    console.log('🔹 Raw request body:', raw);

    // Парсим JSON
    let incoming: any = {};
    try {
      incoming = raw ? JSON.parse(raw) : {};
      console.log('✅ Parsed JSON body:', incoming);
    } catch (err) {
      console.warn('⚠️ Failed to parse JSON, using empty object');
    }

    // Формируем payload для функции Appwrite
    const forwarded = { endpoint: 'webhook', ...incoming };
    console.log('📤 Forwarded payload (to Appwrite Function):', forwarded);

    const appwriteBody = {
      functionId: APPWRITE_FUNCTION_ID,
      data: JSON.stringify(forwarded)
    };
    console.log('📦 Appwrite request body:', appwriteBody);

    // Отправляем в Appwrite
    const resp = await fetch(`${APPWRITE_ENDPOINT}/functions/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY
      },
      body: JSON.stringify(appwriteBody)
    });

    const text = await resp.text();
    console.log('📩 Appwrite raw response:', text);

    // Попробуем отдать JSON если это JSON
    try {
      const parsed = text ? JSON.parse(text) : null;
      console.log('✅ Appwrite parsed response:', parsed);
      return NextResponse.json(parsed, { status: resp.status });
    } catch {
      console.log('⚠️ Appwrite response is not JSON, returning raw text');
      return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (err: any) {
    console.error('❌ Proxy error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function GET() {
  console.log('👋 Health check called');
  return NextResponse.json({ status: 'ok', service: 'TruckerWallet Webhook proxy', timestamp: new Date().toISOString() });
}
