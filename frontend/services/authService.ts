// FIX: Replaced mock implementation with a real API service to connect to the backend.
export interface User {
  id: string;
  name: string;
  role: 'user' | 'admin';
}

const TOKEN_KEY = 'ai_video_analyzer_token';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const login = async (username: string, password: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({error: 'Login failed due to a network error.'}));
    throw new Error(errorData.error || 'Login failed');
  }

  const { user, token } = await response.json();
  if (!user || !token) {
    throw new Error('Invalid response from server during login.');
  }
  
  localStorage.setItem(TOKEN_KEY, token);
  return user;
};

export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const validateToken = async (): Promise<User | null> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      logout(); // Token is invalid, clear it
      return null;
    }

    const { user } = await response.json();
    return user;
  } catch (error) {
    console.error("Token validation failed:", error);
    logout(); // Network error, etc.
    return null;
  }
};
