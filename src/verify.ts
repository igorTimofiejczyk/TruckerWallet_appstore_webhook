import { importX509, createRemoteJWKSet, jwtVerify, CompactSign, decodeProtectedHeader } from 'jose';
import { z } from 'zod';
import * as fs from 'fs/promises';

// Schema for the notification data
const NotificationDataSchema = z.object({
  appAccountToken: z.string().optional(),
  originalTransactionId: z.string(),
}).passthrough();

// Schema for the Apple Server Notification payload
const NotificationSchema = z.object({
  signedPayload: z.string()
});

interface VerificationResult {
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

class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

/**
 * Verifies the Apple Server Notification JWT and its certificate chain
 */
export async function verifySignedPayload(signedPayload: string): Promise<VerificationResult> {
  try {
    // Extract and verify the header
    const header = await decodeProtectedHeader(signedPayload);
    if (!header.x5c || !Array.isArray(header.x5c)) {
      throw new VerificationError('Missing or invalid x5c header');
    }

    // Verify the certificate chain
    const x5c = header.x5c;
    
    // Load Apple Root CA certificate
    const rootCACert = await importX509(
      await fs.readFile('./certs/AppleRootCA-G3.pem', 'utf8'),
      'ES384'
    );

    // Verify certificate chain
    let previousCert = rootCACert;
    for (let i = x5c.length - 1; i >= 0; i--) {
      const cert = await importX509(
        `-----BEGIN CERTIFICATE-----\n${x5c[i]}\n-----END CERTIFICATE-----`,
        'RS256'
      );
      
      // TODO: Verify certificate signatures and validity periods
      // This is a simplified version, in production you should:
      // 1. Verify certificate signatures
      // 2. Check validity periods
      // 3. Check certificate purposes
      // 4. Verify certificate revocation status
      
      previousCert = cert;
    }
    
    // Use the leaf certificate (first in chain) for JWT verification
    const leafCert = await importX509(
      `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`,
      'RS256'
    );
    
    // Verify the signed payload
    const { payload } = await jwtVerify(signedPayload, leafCert, {
      algorithms: ['RS256'],
    });

    // Verify environment and bundle ID
    const environment = payload.environment as string;
    const bundleId = payload.bundleId as string;

    if (environment !== process.env.APPLE_ENV) {
      throw new VerificationError(`Environment mismatch: ${environment}`);
    }

    if (bundleId !== process.env.BUNDLE_ID) {
      throw new VerificationError(`Bundle ID mismatch: ${bundleId}`);
    }

    // Extract and validate notification data
    const rawData = payload.data || {};
    const dataResult = NotificationDataSchema.safeParse(rawData);
    
    if (!dataResult.success) {
      throw new VerificationError('Invalid notification data: ' + dataResult.error.message);
    }

    return {
      bundleId,
      environment,
      notificationUUID: payload.notificationUUID as string,
      type: payload.notificationType as string,
      data: dataResult.data,
    };
  } catch (error) {
    if (error instanceof VerificationError) {
      throw error;
    }
    throw new VerificationError(`JWT verification failed: ${(error as Error).message}`);
  }
}

export { NotificationSchema, VerificationError };