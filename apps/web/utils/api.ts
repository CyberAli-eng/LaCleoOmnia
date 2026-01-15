export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:4000/api';

export async function fetchFromApi(path: string, init?: RequestInit) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        cache: 'no-store',
        ...init,
    });

    if (!res.ok) {
        throw new Error('Failed to fetch data');
    }

    return res.json();
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
