import { NextRequest, NextResponse } from 'next/server';

// Edge Runtime для лучшей производительности
export const runtime = 'edge';

const APPWRITE_FUNCTION_URL = process.env.APPWRITE_FUNCTION_URL!;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;

export async function POST(request: NextRequest) {
  console.log('📱 Apple webhook received');

  try {
    // Получаем body от Apple
    const body = await request.text();
    
    console.log('📦 Payload size:', body.length, 'bytes');

    // Определяем endpoint (webhook, verify, status, etc.)
    const pathname = request.nextUrl.pathname;
    const endpoint = pathname.replace('/api/apple-webhook', '') || '/webhook';

    // Пробрасываем в Appwrite Function
    const appwriteResponse = await fetch(
      `${APPWRITE_FUNCTION_URL}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': APPWRITE_PROJECT_ID,
          'User-Agent': request.headers.get('user-agent') || 'VercelProxy',
        },
        body: body,
      }
    );

    const responseData = await appwriteResponse.text();
    
    console.log('✅ Appwrite response:', appwriteResponse.status);

    return new NextResponse(responseData, {
      status: appwriteResponse.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    return NextResponse.json(
      { error: 'Internal proxy error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const response = await fetch(`${APPWRITE_FUNCTION_URL}/health`, {
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
    });

    const data = await response.json();

    return NextResponse.json({
      status: 'ok',
      appwrite: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Appwrite unreachable' },
      { status: 503 }
    );
  }
}