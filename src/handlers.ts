import { Subscription } from '@prisma/client';
import prisma from './db';
import { VerificationError } from './verify';

export type SubscriptionStatus = 'active' | 'in_grace' | 'in_billing_retry' | 'expired' | 'refunded';

interface NotificationData {
  bundleId: string;
  environment: string;
  notificationUUID: string;
  type: string;
  data: {
    appAccountToken?: string;
    originalTransactionId: string;
    [key: string]: any;
  };
}

/**
 * Process App Store server notification and update subscription status
 */
export async function handleNotification(notificationData: NotificationData): Promise<void> {
  const { notificationUUID, type, data } = notificationData;

  // Check for duplicate notification
  const existingEvent = await prisma.event.findUnique({
    where: { notificationUUID }
  });

  if (existingEvent) {
    return; // Skip processing duplicate notification
  }

  // Save notification event
  await prisma.event.create({
    data: {
      notificationUUID,
      type,
      payloadJSON: JSON.stringify(notificationData)
    }
  });

  try {
    // Find or create user
    const userId = await findOrCreateUser(data.appAccountToken, data.originalTransactionId);

    // Update subscription status
    await updateSubscriptionStatus(userId, type, data);
  } catch (error) {
    console.error('Error processing notification:', error);
    // We still return successfully to prevent Apple from retrying
  }
}

/**
 * Find existing user or create new one
 */
async function findOrCreateUser(appAccountToken?: string, originalTransactionId?: string): Promise<string> {
  if (appAccountToken) {
    const user = await prisma.user.findUnique({
      where: { appAccountToken }
    });
    
    if (user) {
      return user.id;
    }
  }

  // Create new user
  const user = await prisma.user.create({
    data: { appAccountToken: appAccountToken || null }
  });

  return user.id;
}

/**
 * Update subscription status based on notification type
 */
async function updateSubscriptionStatus(
  userId: string,
  type: string,
  data: Record<string, any>
): Promise<void> {
  let status: SubscriptionStatus;
  const { originalTransactionId, productId } = data;

  switch (type) {
    // Initial purchase and renewals
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'DID_RECOVER':  // Subscription recovered after billing retry
      status = 'active';
      break;

    // Payment issues
    case 'DID_FAIL_TO_RENEW':
    case 'DID_CHANGE_RENEWAL_PREF': // User changed renewal preferences
    case 'PRICE_INCREASE': // Price increase requiring user action
      status = 'in_billing_retry';
      break;

    // Grace period
    case 'GRACE_PERIOD_EXPIRED':
    case 'GRACE_PERIOD':
      status = 'in_grace';
      break;

    // Subscription ended
    case 'EXPIRED':
    case 'DID_CANCEL': // User cancelled but subscription still active
      status = 'expired';
      break;

    // Refunds and billing issues
    case 'REFUND':
    case 'REFUND_DECLINED':
    case 'CONSUMPTION_REQUEST':
      status = 'refunded';
      break;

    // Revoke access immediately
    case 'REVOKE':
      status = 'expired';
      await prisma.subscription.update({
        where: { originalTransactionId },
        data: { 
          expiresAt: new Date(),
          graceExpiresAt: null
        }
      });
      break;

    default:
      console.log(`Unhandled notification type: ${type}`);
      return; // Ignore other notification types
  }

  // Update or create subscription
  await prisma.subscription.upsert({
    where: { originalTransactionId },
    update: {
      status,
      expiresAt: data.expiresDate ? new Date(data.expiresDate) : null,
      graceExpiresAt: data.gracePeriodExpiresDate ? new Date(data.gracePeriodExpiresDate) : null
    },
    create: {
      userId,
      originalTransactionId,
      productId,
      status,
      expiresAt: data.expiresDate ? new Date(data.expiresDate) : null,
      graceExpiresAt: data.gracePeriodExpiresDate ? new Date(data.gracePeriodExpiresDate) : null
    }
  });
}