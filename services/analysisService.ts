// FIX: Replaced mock implementation with a real API service to connect to the backend.
import type { AnalysisHistoryItem } from '../types';

const TOKEN_KEY = 'ai_video_analyzer_token';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const getAuthHeaders = (isJson = true) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    throw new Error(errorData.error || response.statusText);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export const getAnalyses = (): Promise<AnalysisHistoryItem[]> => {
  return fetch(`${API_BASE_URL}/analyses`, { headers: getAuthHeaders(false) }).then(handleResponse);
};

export const createAnalysis = (videoName: string, modelUsed: string): Promise<AnalysisHistoryItem> => {
  return fetch(`${API_BASE_URL}/analyses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ videoName, modelUsed }),
  }).then(handleResponse);
};

export const updateAnalysis = (id: number, updatedFields: Partial<Omit<AnalysisHistoryItem, 'videoFile'>>): Promise<AnalysisHistoryItem> => {
  return fetch(`${API_BASE_URL}/analyses/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updatedFields),
  }).then(handleResponse);
};

export const deleteAnalysis = (id: number): Promise<void> => {
  return fetch(`${API_BASE_URL}/analyses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  }).then(handleResponse as (res: Response) => Promise<void>);
};

export const getAllAnalysesForAdmin = (): Promise<AnalysisHistoryItem[]> => {
    // The backend handles authorization via token, so this is the same as getAnalyses
    return getAnalyses();
};

export const deleteAnalysisForAdmin = (id: number): Promise<void> => {
    // Backend uses the token to verify admin role, so the call is the same as deleteAnalysis
    return deleteAnalysis(id);
};
