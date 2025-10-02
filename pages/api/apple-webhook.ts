import type { NextApiRequest, NextApiResponse } from 'next';

const APPWRITE_FUNCTION_URL = process.env.APPWRITE_FUNCTION_URL!;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET для health check
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${APPWRITE_FUNCTION_URL}/health`, {
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        },
      });

      const data = await response.json();

      return res.status(200).json({
        status: 'ok',
        appwrite: data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Appwrite unreachable' 
      });
    }
  }

  // POST для webhook от Apple
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📱 Apple webhook received');

  try {
    // Получаем body
    const body = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);
    
    console.log('📦 Payload size:', body.length, 'bytes');

    // Пробрасываем в Appwrite
    const appwriteResponse = await fetch(
      `${APPWRITE_FUNCTION_URL}/webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': APPWRITE_PROJECT_ID,
          'User-Agent': req.headers['user-agent'] || 'VercelProxy',
        },
        body: body,
      }
    );

    const responseData = await appwriteResponse.text();
    
    console.log('✅ Appwrite response:', appwriteResponse.status);

    return res
      .status(appwriteResponse.status)
      .setHeader('Content-Type', 'application/json')
      .send(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    return res.status(500).json({ 
      error: 'Internal proxy error' 
    });
  }
}

// Важно: отключаем body parser для получения raw body
export const config = {
  api: {
    bodyParser: true, // Vercel автоматически парсит JSON
  },
};