import crypto from 'crypto';

const keyRaw = process.env.CREDENTIALS_ENCRYPTION_KEY;

function getKey(): Buffer {
    if (!keyRaw) {
        throw new Error('CREDENTIALS_ENCRYPTION_KEY not configured');
    }
    if (keyRaw.length === 64) {
        return Buffer.from(keyRaw, 'hex');
    }
    return Buffer.from(keyRaw, 'base64');
}

export function encryptCredentials(plainText: string) {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return JSON.stringify({
        v: 1,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: encrypted.toString('base64'),
    });
}

export function decryptCredentials(payload: string) {
    const parsed = JSON.parse(payload);
    const key = getKey();
    const iv = Buffer.from(parsed.iv, 'base64');
    const tag = Buffer.from(parsed.tag, 'base64');
    const data = Buffer.from(parsed.data, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
}
