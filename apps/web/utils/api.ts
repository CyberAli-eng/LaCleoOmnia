// Get API URL from environment variables
// In production, this MUST be set in Vercel environment variables
// Use consistent value for both server and client to avoid hydration issues
const getApiBaseUrl = () => {
    // In development, always use localhost (unless explicitly overridden)
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         (typeof window !== 'undefined' && window.location.hostname === 'localhost');
    
    // Check environment variables first
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        // In development, ignore production URLs
        if (isDevelopment && process.env.NEXT_PUBLIC_API_BASE_URL.includes('onrender.com')) {
            console.warn('⚠️ Ignoring production API URL in development. Using localhost:8000');
            return 'http://localhost:8000/api';
        }
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
        // In development, ignore production URLs
        if (isDevelopment && process.env.NEXT_PUBLIC_API_URL.includes('onrender.com')) {
            console.warn('⚠️ Ignoring production API URL in development. Using localhost:8000');
            return 'http://localhost:8000/api';
        }
        return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // Default fallback for local development - Python FastAPI backend
    return 'http://localhost:8000/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Validate API URL in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL && !process.env.NEXT_PUBLIC_API_URL) {
        console.error(
            '⚠️ NEXT_PUBLIC_API_URL is not set! ' +
            'Please set it in Vercel environment variables. ' +
            'Current API URL:', API_BASE_URL
        );
    }
}

export async function fetchFromApi(path: string, init?: RequestInit) {
    const url = `${API_BASE_URL}${path}`;
    
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            ...init,
        });

        if (!res.ok) {
            try {
                const data = await res.json();
                throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
            } catch (err: any) {
                if (err instanceof Error && err.message.includes('Request failed')) {
                    throw err;
                }
                const text = await res.text();
                throw new Error(text || `Request failed with status ${res.status}`);
            }
        }

        return res.json();
    } catch (error: any) {
        // Provide more helpful error messages
        if (error instanceof TypeError && error.message.includes('fetch')) {
            const apiUrl = API_BASE_URL;
            if (apiUrl.includes('127.0.0.1') || apiUrl.includes('localhost')) {
                throw new Error(
                    'Cannot connect to API. ' +
                    'Please set NEXT_PUBLIC_API_URL in Vercel environment variables. ' +
                    `Current API URL: ${apiUrl}`
                );
            }
            throw new Error(`Network error: Unable to reach API at ${apiUrl}. ${error.message}`);
        }
        throw error;
    }
}

export function getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') {
        return {};
    }
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authFetch(path: string, init?: RequestInit) {
    return fetchFromApi(path, {
        ...init,
        headers: {
            ...(init?.headers || {}),
            ...getAuthHeaders(),
        },
    });
}
