import React, { useState, useMemo, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalysisHistoryItem, DiagnosticItem, ImprovementSuggestion, StrengthItem, ComplianceBreakdown, ComplianceCategoryReport } from '../types';
import type { User } from '../services/authService';
import RadarChartComponent from './RadarChartComponent';
import {
    ClipboardIcon, ZapIcon, WrenchIcon, CheckCircleIcon, GridIcon, BulbIcon,
    ShieldAlertIcon, FileTextIcon, ThumbsUpIcon, MagnetIcon, ScissorsIcon,
    TypeIcon, MegaphoneIcon, SpinnerIcon, AlertTriangleIcon, UserIcon, CalendarIcon, EyeIcon, EyeOffIcon, SettingsIcon, DownloadIcon,
} from './icons';
import { SUB_SCORE_DETAILS } from '../constants';

interface ResultsDashboardProps {
  analysisItem: AnalysisHistoryItem;
  currentUser: User;
  onTogglePublic: (id: number, isPublic: boolean) => void;
}

const ProgressIndicator: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return (
        <div className="bg-cyan-900/50 border border-cyan-500/30 text-cyan-200 px-4 py-2 rounded-md flex items-center text-sm w-full">
            <SpinnerIcon className="w-4 h-4 mr-3" />
            <span>{message}</span>
        </div>
    );
};

const ScoreCard: React.FC<{ score: number, grade: string }> = ({ score, grade }) => {
    const getGradeColor = (g: string) => {
        if (g === 'A') return 'text-green-400';
        if (g === 'B') return 'text-cyan-400';
        if (g === 'C') return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-black/30 p-4 sm:p-6 rounded-md border border-cyan-500/20 backdrop-blur-sm relative overflow-hidden">
            <div className="grid grid-cols-2 gap-4">
                <div className="border-r border-cyan-500/20 pr-4">
                    <p className="text-sm text-cyan-400/70 mb-1 tracking-widest">總分</p>
                    <p className={`text-5xl sm:text-6xl font-bold ${getGradeColor(grade)}`}>{score}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-cyan-400/70 mb-1 tracking-widest">評級</p>
                    <p className={`text-5xl sm:text-6xl font-bold ${getGradeColor(grade)}`}>{grade}</p>
                </div>
            </div>
        </div>
    );
};

const AnalysisMetaCard: React.FC<{ uploaderName: string, date: string, modelUsed?: string }> = ({ uploaderName, date, modelUsed }) => (
    <div className="bg-black/30 p-4 rounded-md border border-cyan-500/20 backdrop-blur-sm text-sm h-full">
        <div className="flex flex-col space-y-3">
            <div className="flex items-center text-gray-400 space-x-2">
                <UserIcon className="w-4 h-4 text-cyan-400" />
                <span>上傳者: <span className="font-semibold text-gray-300">{uploaderName}</span></span>
            </div>
            <div className="flex items-center text-gray-400 space-x-2">
                <CalendarIcon className="w-4 h-4 text-cyan-400" />
                <span>分析時間: <span className="font-semibold text-gray-300">{new Date(date).toLocaleString('zh-TW')}</span></span>
            </div>
             {modelUsed && (
                 <div className="flex items-center text-gray-400 space-x-2">
                    <ZapIcon className="w-4 h-4 text-cyan-400" />
                    <span>分析模型: <span className="font-semibold text-gray-300">{modelUsed}</span></span>
                </div>
            )}
        </div>
    </div>
);


const AnalysisSettingsCard: React.FC<{ isPublic: boolean, onToggle: () => void }> = ({ isPublic, onToggle }) => {
    return (
        <div className="bg-black/30 p-4 rounded-md border border-cyan-500/20 backdrop-blur-sm h-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <SettingsIcon className="w-5 h-5 text-cyan-400"/>
                    <h4 className="font-semibold text-gray-200">報告設定</h4>
                </div>
                <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${isPublic ? 'text-green-400' : 'text-gray-400'}`}>
                        {isPublic ? '公開' : '私有'}
                    </span>
                    <button
                        onClick={onToggle}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isPublic ? 'bg-cyan-600' : 'bg-gray-600'}`}
                        aria-label="Toggle public visibility"
                    >
                        <span
                            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                        {isPublic ? 
                            <EyeIcon className="absolute right-1 w-3 h-3 text-cyan-200" /> : 
                            <EyeOffIcon className="absolute left-1 w-3 h-3 text-gray-300" />
                        }
                    </button>
                </div>
            </div>
             <p className="text-xs text-gray-500 mt-2">設為公開後，其他使用者將能查看此份分析報告。</p>
        </div>
    );
};

// Other sub-components (ImpactBadge, FixTypeBadge, etc.) would be here...

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ analysisItem, currentUser, onTogglePublic }) => {
  const { videoFile, videoUrl: videoUrlFromProp, fullResult, status, totalScore, grade, uploaderName, date, uploaderId, isPublic, progressMessage, modelUsed } = analysisItem;
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = useMemo(() => videoUrlFromProp || (videoFile ? URL.createObjectURL(videoFile) : ''), [videoUrlFromProp, videoFile]);

  const subScoreDataForChart = useMemo(() => {
      if (!fullResult?.subScores) return [];
      return Object.entries(fullResult.subScores).map(([key, value]) => ({
          subject: SUB_SCORE_DETAILS[key]?.name.split(' ')[0] || key,
          A: value,
          fullMark: 100,
      }));
  }, [fullResult?.subScores]);

  const isOwner = currentUser.id === uploaderId;
  
  return (
    <div>
        <div className="flex justify-between items-start mb-6">
            <div className="flex-grow">
                {status !== 'full-complete' && (
                    <ProgressIndicator message={progressMessage} />
                )}
            </div>
        </div>
        
        <div className="flex flex-col space-y-8 pb-12">
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="flex flex-col space-y-4 w-full max-w-sm mx-auto">
                    <div className="relative overflow-hidden rounded-md border border-cyan-500/20 shadow-[0_0_15px_rgba(56,189,248,0.2)] bg-black aspect-[9/16] w-full">
                      <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-cover" key={videoUrl}></video>
                    </div>
              </div>
              
              <div className="flex flex-col space-y-6">
                {(status === 'full-complete' && totalScore !== undefined && grade !== undefined)
                    ? <ScoreCard score={totalScore} grade={grade} />
                    : <p>分析中...</p>
                }
                <div className="bg-black/30 p-6 rounded-md border border-cyan-500/20 backdrop-blur-sm">
                  <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">子分項解析</h3>
                  <div className="h-96">
                    {fullResult?.subScores 
                        ? <RadarChartComponent data={subScoreDataForChart} />
                        : <div className="h-full flex items-center justify-center"><p className="text-gray-500">計算中...</p></div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">報告資訊與設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnalysisMetaCard uploaderName={uploaderName} date={date} modelUsed={modelUsed} />
                {isOwner && (
                    <AnalysisSettingsCard 
                        isPublic={isPublic} 
                        onToggle={() => onTogglePublic(analysisItem.id, !isPublic)}
                    />
                )}
            </div>
          </section>
        </div>
    </div>
  );
};

export default ResultsDashboard;
