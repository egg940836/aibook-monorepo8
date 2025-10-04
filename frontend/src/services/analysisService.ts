import type { AnalysisHistoryItem } from '../types';
import { apiClient } from './apiClient';

export const getAnalyses = (): Promise<AnalysisHistoryItem[]> => {
  return apiClient.get('/analyses');
};

export const createAnalysis = (videoName: string, modelUsed: string): Promise<AnalysisHistoryItem> => {
  return apiClient.post('/analyses', { videoName, modelUsed });
};

export const updateAnalysis = (id: number, updatedFields: Partial<Omit<AnalysisHistoryItem, 'videoFile' | 'id'>>): Promise<AnalysisHistoryItem> => {
  return apiClient.patch(`/analyses/${id}`, updatedFields);
};

export const deleteAnalysis = (id: number): Promise<void> => {
  return apiClient.delete(`/analyses/${id}`);
};

export const getAllAnalysesForAdmin = (): Promise<AnalysisHistoryItem[]> => {
    return apiClient.get('/analyses');
};

export const deleteAnalysisForAdmin = (id: number): Promise<void> => {
    return apiClient.delete(`/analyses/${id}`);
};
