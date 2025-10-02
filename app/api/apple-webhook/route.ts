// app/api/apple-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;
const APPWRITE_FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID!;

export async function POST(request: NextRequest) {
  try {
    // Получаем тело как текст (Apple присылает JSON)
    const raw = await request.text();

    // Попытка распарсить JSON — если не JSON, оставляем пустой объект
    let incoming: any = {};
    try { incoming = raw ? JSON.parse(raw) : {}; } catch { incoming = {}; }

    // Формируем payload для Appwrite Function — добавляем endpoint для маршрутизации внутри функции
    const forwarded = { endpoint: 'webhook', ...incoming };

    // Формируем тело запроса для Appwrite Cloud executions endpoint
    const appwriteBody = {
      functionId: APPWRITE_FUNCTION_ID,
      // important: data MUST be a string (serialized JSON)
      data: JSON.stringify(forwarded)
    };

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
    // Попытаемся вернуть JSON если это JSON
    try {
      const parsed = text ? JSON.parse(text) : null;
      return NextResponse.json(parsed, { status: resp.status });
    } catch {
      return new NextResponse(text, { status: resp.status, headers: { 'Content-Type': 'application/json' }});
    }

  } catch (err: any) {
    console.error('Proxy error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'TruckerWallet Webhook proxy', timestamp: new Date().toISOString() });
}
