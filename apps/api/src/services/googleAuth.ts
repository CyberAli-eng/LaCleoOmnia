import { OAuth2Client } from 'google-auth-library';

const clientId = process.env.GOOGLE_CLIENT_ID;

const client = clientId ? new OAuth2Client(clientId) : null;

export async function verifyGoogleIdToken(idToken: string) {
    if (!client || !clientId) {
        throw new Error('Google OAuth not configured');
    }
    const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
        throw new Error('Google token missing email');
    }
    return {
        email: payload.email,
        name: payload.name || undefined,
        googleId: payload.sub,
    };
}
