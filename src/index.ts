import express from 'express';
import dotenv from 'dotenv';
import { pino } from 'pino';
import { NotificationSchema, verifySignedPayload } from './verify';
import { handleNotification } from './handlers';

dotenv.config();

const app = express();
const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});

// Middleware
app.use(express.json());

// Welcome page
app.get('/', (_, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>App Store Webhook Server</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1 { color: #2c3e50; }
          .endpoint {
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .method {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 14px;
            font-weight: bold;
          }
          .get { background: #28a745; color: white; }
          .post { background: #007bff; color: white; }
        </style>
      </head>
      <body>
        <h1>App Store Webhook Server</h1>
        <p>This server handles App Store Server Notifications v2 for in-app purchases and subscriptions.</p>
        
        <h2>Available Endpoints:</h2>
        
        <div class="endpoint">
          <span class="method get">GET</span>
          <code>/health</code>
          <p>Health check endpoint. Returns "ok" if the server is running.</p>
        </div>
        
        <div class="endpoint">
          <span class="method post">POST</span>
          <code>/appstore-webhooks</code>
          <p>Webhook endpoint for receiving App Store server notifications.</p>
          <p>Expects a signed payload in the request body as specified in the 
             <a href="https://developer.apple.com/documentation/appstoreservernotifications">App Store Server Notifications documentation</a>.</p>
        </div>

        <p>Environment: ${process.env.APPLE_ENV || 'Not configured'}</p>
      </body>
    </html>
  `;
  res.send(html);
});

// Health check endpoint
app.get('/health', (_, res) => {
  res.send('ok');
});

// Webhook endpoint
app.post('/appstore-webhooks', async (req, res) => {
  try {
    // Parse and validate request body
    const result = NotificationSchema.safeParse(req.body);
    if (!result.success) {
      logger.error({ error: result.error }, 'Invalid request body');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Always respond with 200 OK quickly
    res.status(200).end();

    // Process notification asynchronously
    try {
      const { signedPayload } = result.data;
      const verifiedData = await verifySignedPayload(signedPayload);
      
      logger.info({
        type: verifiedData.type,
        uuid: verifiedData.notificationUUID,
        env: verifiedData.environment
      }, 'Processing notification');

      await handleNotification(verifiedData);
    } catch (error) {
      logger.error({ error }, 'Error processing notification');
    }
  } catch (error) {
    // This shouldn't happen since we already responded
    logger.error({ error }, 'Unexpected error');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info({ port }, 'Server started');
});