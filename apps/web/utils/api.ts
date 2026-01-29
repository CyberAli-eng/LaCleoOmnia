// Get API URL from environment variables
// In production, this MUST be set in Vercel environment variables
// Use consistent value for both server and client to avoid hydration issues
const getApiBaseUrl = () => {
    // In development, always use localhost (unless explicitly overridden)
    // Note: window is not available during build, so check NODE_ENV first
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         (typeof window !== 'undefined' && window?.location?.hostname === 'localhost');
    
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

        const text = await res.text();
        if (!res.ok) {
            let msg = text || `Request failed with status ${res.status}`;
            try {
                const data = JSON.parse(text);
                const d = data?.detail ?? data?.error ?? data?.message;
                if (d != null) msg = typeof d === 'string' ? d : JSON.stringify(d);
            } catch {
                /* use msg as-is */
            }
            throw new Error(msg);
        }
        if (!text || text.trim() === '') return {};
        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Invalid JSON response');
        }
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

export function getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') {
        return {};
    }
    // Try to get token from both localStorage and cookies
    const token = localStorage.getItem('token') || 
                  (typeof document !== 'undefined' ? 
                   document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1] : null);
    
    if (!token) {
        console.warn('⚠️ No authentication token found');
        return {};
    }
    
    return { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

export async function authFetch(path: string, init?: RequestInit) {
    const authHeaders = getAuthHeaders();
    
    // If no token, throw a clear error
    if (!authHeaders['Authorization']) {
        // Redirect to login if we're in the browser
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('Authentication required. Please login again.');
    }
    
    return fetchFromApi(path, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...authHeaders,
            ...(init?.headers || {}),
        },
    });
}
