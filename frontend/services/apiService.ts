import { generatePreliminaryReport, generateFullReport, generateThumbnail } from './geminiService';
import * as analysisService from './analysisService';
import type { User } from './authService';
import type { AnalysisHistoryItem, AnalysisOptions, FullAnalysisResult } from '../types';
import { Placement } from '../types';
import { UNIVERSAL_WEIGHTS } from '../constants';


/**
 * Orchestrates the entire video analysis process, simulating a backend service.
 * It provides real-time updates to the UI via callback functions.
 * @param file The video file to analyze.
 * @param currentUser The user initiating the analysis.
 * @param model The AI model selected by the user.
 * @param onUpdate A callback function that receives the updated AnalysisHistoryItem at each stage.
 * @param onError A callback function to handle errors.
 */
export const startAnalysis = async (
    file: File,
    currentUser: User,
    model: string,
    onUpdate: (item: AnalysisHistoryItem) => void,
    onError: (id: number, message: string) => void
): Promise<void> => {

    let analysisId: number | null = null;
    // Use a temporary ID for error reporting in case the initial creation fails
    let errorId = Date.now();

    try {
      // STAGE 0: Create the record on the backend first to get a real ID.
      const newAnalysisRecord = await analysisService.createAnalysis(file.name, model);
      analysisId = newAnalysisRecord.id;
      errorId = analysisId; // Use the real ID for error reporting from now on.

      let analysisItem: AnalysisHistoryItem = {
          ...newAnalysisRecord,
          videoFile: file,
          status: 'analyzing-preliminary',
          progressMessage: '已加入分析佇列...',
      };
      onUpdate(analysisItem);

      // STAGE 1: PRELIMINARY ANALYSIS & THUMBNAIL GENERATION
      analysisItem.progressMessage = '正在產生縮圖與擷取逐字稿...';
      onUpdate(analysisItem);

      const [preliminaryResult, thumbnailUrl] = await Promise.all([
        generatePreliminaryReport(file),
        generateThumbnail(file)
      ]);

      analysisItem = {
          ...analysisItem,
          thumbnailUrl,
          preliminaryResult,
          status: 'analyzing-full',
          progressMessage: '初步分析完成，正在進行深度分析...'
      };

      await analysisService.updateAnalysis(analysisId, { 
        thumbnailUrl, 
        preliminaryResult, 
        status: 'analyzing-full',
        progressMessage: analysisItem.progressMessage,
      });
      onUpdate(analysisItem);

      // STAGE 2: FULL ANALYSIS (STREAMING)
      const aiDrivenOptions: AnalysisOptions = { placement: Placement.Reels, language: 'zh-TW' };
      
      const handleStreamUpdate = async (partialResult: Partial<FullAnalysisResult>, progressMessage: string) => {
        // FIX: Replaced non-existent getAnalysisById with getAnalyses and find
        const allItems = await analysisService.getAnalyses();
        const currentItem = allItems.find(item => item.id === analysisId);
        if (!currentItem) return;

        const updatedItem = {
            ...currentItem,
            videoFile: file, // Re-attach local file for viewer
            progressMessage: progressMessage,
            fullResult: {
                ...currentItem.fullResult,
                ...partialResult,
            },
        };
        await analysisService.updateAnalysis(analysisId, { fullResult: updatedItem.fullResult, progressMessage });
        onUpdate(updatedItem);
      };
      
      const fullResult = await generateFullReport(analysisItem.videoFile, analysisItem.preliminaryResult!, aiDrivenOptions, handleStreamUpdate);

      // STAGE 3: FINAL SCORE CALCULATION
       analysisItem.progressMessage = '所有分析完成，正在計算最終分數...';
       onUpdate(analysisItem);

      const weights = UNIVERSAL_WEIGHTS;
      let creativeScore = 0;
      if (fullResult.subScores) {
        for (const key in weights) {
            if (fullResult.subScores[key]) {
                creativeScore += fullResult.subScores[key] * weights[key];
            }
        }
      }

      const complianceScore = fullResult.complianceBreakdown?.overallScore ?? 70;
      const finalWeightedScore = (creativeScore * 0.6) + (complianceScore * 0.4);
      const totalScore = Math.max(0, Math.round(finalWeightedScore));
      let grade = 'D';
      if (totalScore >= 90) grade = 'A';
      else if (totalScore >= 80) grade = 'B';
      else if (totalScore >= 70) grade = 'C';
      
      const finalHistoryItem: AnalysisHistoryItem = {
          ...analysisItem,
          fullResult,
          totalScore,
          grade,
          status: 'full-complete',
          progressMessage: '分析完成',
      };
      
      await analysisService.updateAnalysis(analysisId, {
        fullResult,
        totalScore,
        grade,
        status: 'full-complete',
        progressMessage: '分析完成',
      });

      onUpdate(finalHistoryItem);

    } catch (err) {
      console.error("Full analysis process failed:", err);
      const errorMessage = '分析過程中發生錯誤，請重試。';
      if (analysisId) {
        await analysisService.deleteAnalysis(analysisId);
      }
      onError(errorId, errorMessage);
    }
};
