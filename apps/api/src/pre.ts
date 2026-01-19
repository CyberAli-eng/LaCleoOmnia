// Environment variable validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

// Set defaults for development
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db';
}
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'supersecret_fallback_key';
    if (process.env.NODE_ENV !== 'production') {
        console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET in production!');
    }
}
