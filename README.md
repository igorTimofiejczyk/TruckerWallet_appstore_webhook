# App Store Server Notifications v2 Webhook

A production-ready webhook handler for App Store Server Notifications v2 (iOS subscriptions) built with Node.js, TypeScript, and Express.

## Features

- Handles App Store Server Notifications v2
- JWS verification with certificate chain validation
- SQLite database with Prisma ORM
- Idempotent notification processing
- Subscription status tracking
- Ready for serverless deployment (Vercel)
- Comprehensive logging
- TypeScript support

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- SQLite

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd appstore-webhook
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp example.env .env
```

4. Update .env with your configuration:
```
BUNDLE_ID=your.bundle.id
APPLE_ENV=sandbox  # or production
DATABASE_URL="file:./dev.db"
```

5. Initialize the database:
```bash
npx prisma migrate deploy
```

## Development

1. Start the development server:
```bash
npm run dev
```

2. Create test data:
```bash
npm run seed
```

## Testing Webhooks

Test the webhook with a sample notification:

```bash
curl -X POST http://localhost:3000/appstore-webhooks \
  -H "Content-Type: application/json" \
  -d '{"signedPayload": "your.test.jwt.here"}'
```

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Set up environment variables in Vercel:
```bash
vercel env add BUNDLE_ID
vercel env add APPLE_ENV
vercel env add DATABASE_URL
```

4. Configure App Store Connect:
   - Go to App Store Connect > App > App Store Server Notifications
   - Add your Vercel deployment URL (e.g., https://your-app.vercel.app/appstore-webhooks)
   - Select version 2 for the notification format

## Database Schema

### Users
- id: string (primary key)
- appAccountToken: string (unique, optional)
- createdAt: datetime

### Subscriptions
- id: string (primary key)
- userId: string (foreign key)
- originalTransactionId: string (unique)
- productId: string
- status: string (active, in_grace, in_billing_retry, expired, refunded)
- expiresAt: datetime (optional)
- graceExpiresAt: datetime (optional)
- updatedAt: datetime

### Events
- id: string (primary key)
- notificationUUID: string (unique)
- type: string
- payloadJSON: string
- createdAt: datetime

## Supported Notification Types

- SUBSCRIBED
- DID_RENEW
- DID_FAIL_TO_RENEW
- GRACE_PERIOD
- EXPIRED
- REFUND
- PRICE_INCREASE

## Error Handling

The webhook always returns 200 OK to prevent Apple from retrying notifications, but logs any processing errors for monitoring.

## Security

- JWS signature verification
- Certificate chain validation up to Apple Root CA
- Environment and bundle ID validation
- Idempotency checks

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.