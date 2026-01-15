import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

const s3 = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: Boolean(S3_ENDPOINT),
    credentials: S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
        ? { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }
        : undefined,
});

export async function uploadLabel(key: string, body: Buffer) {
    if (!S3_BUCKET) {
        throw new Error('S3_BUCKET not configured');
    }
    await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'text/plain',
    }));

    if (S3_PUBLIC_URL) {
        return `${S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
    }

    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    return getSignedUrl(s3, command, { expiresIn: 3600 });
}
