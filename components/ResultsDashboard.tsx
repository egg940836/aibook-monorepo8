
import React, { useState, useMemo, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalysisHistoryItem, DiagnosticItem, ImprovementSuggestion, StrengthItem, ComplianceBreakdown, ComplianceCategoryReport } from '../types';
import type { User } from '../services/authService';
import RadarChartComponent from './RadarChartComponent';
import {
    ClipboardIcon, ZapIcon, WrenchIcon, CheckCircleIcon, GridIcon, BulbIcon,
    TagIcon, ShieldAlertIcon, FileTextIcon, ThumbsUpIcon, MagnetIcon, ScissorsIcon,
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


const ImpactBadge: React.FC<{ impact: 'high' | 'medium' | 'low' }> = ({ impact }) => {
    const impactMap = {
        high: { text: '高影響', color: 'bg-red-500/20 text-red-300', icon: <ZapIcon className="w-3 h-3 mr-1" /> },
        medium: { text: '中影響', color: 'bg-yellow-500/20 text-yellow-300', icon: <ZapIcon className="w-3 h-3 mr-1" /> },
        low: { text: '低影響', color: 'bg-cyan-500/20 text-cyan-300', icon: <ZapIcon className="w-3 h-3 mr-1" /> },
    };
    const { text, color, icon } = impactMap[impact];
    return <div className={`flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${color}`}>{icon}{text}</div>;
};

const FixTypeBadge: React.FC<{ fixType: string }> = ({ fixType }) => (
    <div className="flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-gray-700 text-gray-300">
        <WrenchIcon className="w-3 h-3 mr-1" />
        {fixType}
    </div>
);

const DiagnosticCard: React.FC<{ item: DiagnosticItem, onTimestampClick: (ts: number) => void }> = ({ item, onTimestampClick }) => {
    const impactColorMap = {
        high: 'border-red-500/50',
        medium: 'border-yellow-500/50',
        low: 'border-cyan-500/50'
    };
    
    return (
        <div className={`bg-black/20 p-4 rounded-md border-l-4 ${impactColorMap[item.impact]}`}>
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 text-center">
                    <img src={item.screenshotUrl} alt={`Timestamp ${item.timestamp}s`} className="w-24 aspect-[9/16] object-cover rounded-sm border border-cyan-500/20" />
                    <button onClick={() => onTimestampClick(item.timestamp)} className="text-xs text-cyan-400 mt-1 hover:underline w-full">
                        @{item.timestamp.toFixed(1)}s
                    </button>
                </div>
                <div className="flex-grow">
                    <h4 className="font-bold text-gray-100 mb-2 break-words">{item.title}</h4>
                    <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                        <ImpactBadge impact={item.impact} />
                        <FixTypeBadge fixType={item.fixType} />
                    </div>
                    <p className="text-sm text-gray-400 mb-2 break-words"><span className="font-semibold text-red-400">問題原因：</span> {item.penaltyReason}</p>
                    <p className="text-sm text-green-400 break-words"><span className="font-semibold text-green-300">修改建議：</span> {item.suggestion}</p>
                </div>
            </div>
        </div>
    );
};

const PrioritySuggestionCard: React.FC<{ item: DiagnosticItem, onTimestampClick: (ts: number) => void }> = ({ item, onTimestampClick }) => {
    return (
        <div className="bg-black/30 p-4 rounded-md border border-cyan-500/20 hover:border-cyan-400/50 transition-colors backdrop-blur-sm">
             <div className="flex items-center space-x-2 mb-2">
                <ImpactBadge impact={item.impact} />
                <FixTypeBadge fixType={item.fixType} />
            </div>
            <p className="text-sm text-gray-200 mb-2 font-semibold break-words">{item.title} <button onClick={() => onTimestampClick(item.timestamp)} className="text-cyan-400 hover:underline">@{item.timestamp.toFixed(1)}s</button></p>
            <p className="text-sm text-green-400 break-words">{item.suggestion}</p>
        </div>
    );
};

const StrategyCard: React.FC<{ item: ImprovementSuggestion }> = ({ item }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.actionableItem);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const iconMap: Record<ImprovementSuggestion['type'], React.ReactNode> = {
    'Hook': <MagnetIcon className="w-6 h-6 text-red-400" />,
    'Editing': <ScissorsIcon className="w-6 h-6 text-purple-400" />,
    'Subtitles': <TypeIcon className="w-6 h-6 text-cyan-400" />,
    'CTA': <MegaphoneIcon className="w-6 h-6 text-green-400" />,
  };

  return (
    <div className="bg-black/30 p-4 rounded-md border border-cyan-500/20 backdrop-blur-sm flex flex-col">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-md">{iconMap[item.type]}</div>
        <div className="flex-grow">
          <h4 className="font-bold text-white mb-1">{item.title}</h4>
          <p className="text-sm text-gray-400 mb-3">{item.description}</p>
          <div className="bg-gray-900/50 p-3 rounded-sm text-sm text-gray-300 whitespace-pre-wrap relative group">
            <code>{item.actionableItem}</code>
            <div className="absolute top-2 right-2 flex space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
               <button onClick={handleCopy} className="p-1.5 bg-gray-700 rounded-sm hover:bg-gray-600">
                 {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400"/> : <ClipboardIcon className="w-4 h-4"/>}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StrengthCard: React.FC<{ item: StrengthItem }> = ({ item }) => (
    <div className="flex items-start space-x-4 bg-green-500/10 p-4 rounded-md border-l-4 border-green-500/50">
        <div className="flex-shrink-0">
            <ThumbsUpIcon className="w-5 h-5 text-green-400"/>
        </div>
        <div>
            <h4 className="font-bold text-green-200">{item.title}</h4>
            <p className="text-sm text-green-300/80 mt-1">{item.description}</p>
        </div>
    </div>
);

const SafeAreaOverlay: React.FC = () => (
    <div className="absolute inset-0 pointer-events-none text-xs uppercase tracking-widest">
        <div className="absolute top-0 left-0 right-0 h-[5%] bg-cyan-900/30 flex items-center justify-center border-b border-cyan-500/50 text-cyan-400">
            <span>[ UI 遮擋區 ]</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-cyan-900/30 flex items-center justify-center border-t border-cyan-500/50 text-cyan-400">
             <span>[ 標題與導航列 ]</span>
        </div>
        <div className="absolute top-0 right-0 bottom-0 w-[15%] bg-cyan-900/30 flex items-center justify-center border-l border-cyan-500/50 text-cyan-400">
            <span className="transform -rotate-90 whitespace-nowrap">[ 互動按鈕 ]</span>
        </div>
        <div 
            className="absolute left-0 right-0 border-y-2 border-dashed border-yellow-400"
            style={{ top: '14.84375%', bottom: '14.84375%' }}
        >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-900/80 text-yellow-300 px-2 py-0.5 rounded-sm text-xs normal-case">4:5 動態消息安全區</span>
        </div>
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
    </div>
);

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; }> = ({ title, icon, children }) => (
    <div className="bg-black/30 rounded-md p-4 sm:p-6 border border-cyan-500/20 backdrop-blur-sm">
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="text-md sm:text-lg font-semibold ml-3 text-cyan-300 tracking-wider">{title}</h3>
        </div>
        <div>{children}</div>
    </div>
);

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-black/30 rounded-md p-6 border border-cyan-500/10 animate-pulse backdrop-blur-sm ${className}`}>
        <div className="h-5 bg-gray-700/50 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
            <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
        </div>
    </div>
);

const SkeletonScoreCard: React.FC = () => (
     <div className="bg-black/30 p-6 rounded-md border border-cyan-500/10 flex items-center justify-between animate-pulse backdrop-blur-sm">
        <div>
            <div className="h-4 bg-gray-700/50 rounded w-12 mb-2"></div>
            <div className="h-14 bg-gray-700/50 rounded w-24"></div>
        </div>
        <div className="text-right">
             <div className="h-4 bg-gray-700/50 rounded w-12 mb-2 ml-auto"></div>
             <div className="h-14 bg-gray-700/50 rounded w-16"></div>
        </div>
    </div>
);

const SeverityBadge: React.FC<{ severity: 'high' | 'medium' | 'low' }> = ({ severity }) => {
    const severityMap = {
        high: { text: '高風險', color: 'bg-red-500/20 text-red-300' },
        medium: { text: '中風險', color: 'bg-yellow-500/20 text-yellow-300' },
        low: { text: '低風險', color: 'bg-cyan-500/20 text-cyan-300' },
    };
    const { text, color } = severityMap[severity];
    return <div className={`flex-shrink-0 px-2 py-0.5 rounded-sm text-xs font-medium ${color}`}>{text}</div>;
};

const ComplianceCategoryCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    data: ComplianceCategoryReport;
    onTimestampClick: (ts: number) => void;
}> = ({ title, icon, data, onTimestampClick }) => {
    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-400';
        if (score >= 70) return 'text-cyan-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-black/20 p-4 rounded-md border border-cyan-500/10">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    {icon}
                    <h4 className="font-bold text-gray-200">{title}</h4>
                </div>
                <div className="text-right">
                    <span className="text-xs text-cyan-400/70">風險評分</span>
                    <p className={`text-2xl font-bold ${getScoreColor(data.score)}`}>{data.score}</p>
                </div>
            </div>
            <p className="text-sm text-gray-400 mb-4 pb-4 border-b border-cyan-500/10">{data.summary}</p>
            <div>
                {data.issues.length > 0 ? (
                    <div className="space-y-3">
                        {data.issues.map((issue, index) => (
                            <div key={index} className="flex items-start space-x-3">
                                <SeverityBadge severity={issue.severity} />
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-300">{issue.description}</p>
                                    {issue.timestamp !== undefined && (
                                        <button onClick={() => onTimestampClick(issue.timestamp!)} className="text-xs text-cyan-400 mt-0.5 hover:underline">
                                            @{issue.timestamp.toFixed(1)}s
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-2">未發現特定問題</p>
                )}
            </div>
        </div>
    );
};

const ComplianceReport: React.FC<{
    complianceData: ComplianceBreakdown;
    onTimestampClick: (ts: number) => void;
}> = ({ complianceData, onTimestampClick }) => {
    const getOverallScoreColor = (score: number) => {
        if (score >= 90) return 'border-green-500/50 text-green-400';
        if (score >= 70) return 'border-cyan-500/50 text-cyan-400';
        if (score >= 50) return 'border-yellow-500/50 text-yellow-400';
        return 'border-red-500/50 text-red-400';
    };

    return (
        <div className="space-y-6">
            <div className={`bg-black/30 p-6 rounded-md border-l-4 ${getOverallScoreColor(complianceData.overallScore).split(' ')[0]} backdrop-blur-sm`}>
                <div className="flex items-start space-x-6">
                    <div className="flex flex-col items-center">
                        <span className="text-sm text-cyan-400/70 tracking-widest">總合規分數</span>
                        <p className={`text-6xl font-bold ${getOverallScoreColor(complianceData.overallScore).split(' ')[1]}`}>{complianceData.overallScore}</p>
                    </div>
                    <div className="flex-grow">
                        <h4 className="font-bold text-gray-200 mb-2">總體摘要</h4>
                        <p className="text-sm text-gray-400">{complianceData.overallSummary}</p>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ComplianceCategoryCard 
                    title="法律風險"
                    icon={<ShieldAlertIcon className="w-5 h-5 text-red-400" />}
                    data={complianceData.legal}
                    onTimestampClick={onTimestampClick}
                />
                <ComplianceCategoryCard 
                    title="社群風險"
                    icon={<AlertTriangleIcon className="w-5 h-5 text-yellow-400" />}
                    data={complianceData.social}
                    onTimestampClick={onTimestampClick}
                />
                 <ComplianceCategoryCard 
                    title="廣告政策"
                    icon={<FileTextIcon className="w-5 h-5 text-cyan-400" />}
                    data={complianceData.adPolicy}
                    onTimestampClick={onTimestampClick}
                />
            </div>
        </div>
    );
};


const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ analysisItem, currentUser, onTogglePublic }) => {
  const { videoFile, videoUrl: videoUrlFromProp, preliminaryResult, fullResult, status, totalScore, grade, uploaderName, date, uploaderId, isPublic, progressMessage, modelUsed } = analysisItem;
  const videoRef = useRef<HTMLVideoElement>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const videoUrl = useMemo(() => videoUrlFromProp || (videoFile ? URL.createObjectURL(videoFile) : ''), [videoUrlFromProp, videoFile]);

  const handleTimestampClick = useCallback((timestamp: number) => {
    if (videoRef.current) {
        videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            if(videoRef.current) {
                videoRef.current.currentTime = timestamp;
                videoRef.current.play();
            }
        }, 400);
    }
  }, []);
  
  const subScoreDataForChart = useMemo(() => {
      if (!fullResult?.subScores) return [];
      return Object.entries(fullResult.subScores).map(([key, value]) => ({
          subject: SUB_SCORE_DETAILS[key]?.name.split(' ')[0] || key,
          A: value,
          fullMark: 100,
      }));
  }, [fullResult?.subScores]);

  const prioritySuggestions = useMemo(() => {
    if (!fullResult?.diagnostics) return [];
    return [...fullResult.diagnostics]
        .sort((a, b) => {
            const impactScores = { high: 3, medium: 2, low: 1 };
            return impactScores[b.impact] - impactScores[a.impact];
        })
        .slice(0, 3);
  }, [fullResult?.diagnostics]);

  const isOwner = currentUser.id === uploaderId;
  
  const handleExport = async () => {
    if (!reportContentRef.current || isExporting) return;
    setIsExporting(true);
    // Logic removed for brevity
    setIsExporting(false);
  };
  
  return (
    <div>
        <div className="flex justify-between items-start mb-6">
            <div className="flex-grow">
                {status !== 'full-complete' && status !== 'error' && (
                    <ProgressIndicator message={progressMessage} />
                )}
            </div>
             {status === 'full-complete' && (
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex-shrink-0 ml-4 flex items-center justify-center space-x-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded-md shadow-lg hover:bg-cyan-500 transition-colors duration-300 border border-cyan-400 disabled:opacity-50 disabled:cursor-wait"
                >
                    {isExporting ? <SpinnerIcon className="w-5 h-5" /> : <DownloadIcon className="w-5 h-5" />}
                    <span>{isExporting ? '正在匯出...' : '匯出報告'}</span>
                </button>
            )}
        </div>
        
        <div ref={reportContentRef} className="flex flex-col space-y-8 pb-12">
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="flex flex-col space-y-4 w-full max-w-sm mx-auto">
                <div className="flex flex-col space-y-2">
                    <div className="relative overflow-hidden rounded-md border border-cyan-500/20 shadow-[0_0_15px_rgba(56,189,248,0.2)] bg-black aspect-[9/16] w-full">
                      <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-cover" key={videoUrl}></video>
                      {showSafeArea && <SafeAreaOverlay />}
                    </div>
                    <div className="flex items-center justify-between bg-black/30 border border-cyan-500/20 px-3 py-1.5 rounded-md w-full backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-cyan-400/70">播放速度:</span>
                        {[0.75, 1, 1.25].map(rate => (
                          <button key={rate} onClick={() => videoRef.current && (videoRef.current.playbackRate = rate)} className={`px-2 py-0.5 text-xs rounded-sm ${videoRef.current?.playbackRate === rate ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                            {rate}x
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setShowSafeArea(s => !s)} className={`flex items-center space-x-1.5 px-2 py-0.5 text-xs rounded-sm ${showSafeArea ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        <GridIcon className="w-3 h-3"/>
                        <span>安全區</span>
                      </button>
                    </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-6">
                {(status === 'full-complete' || (totalScore && grade))
                    ? <ScoreCard score={totalScore!} grade={grade!} />
                    : <SkeletonScoreCard />
                }
                <div className="bg-black/30 p-6 rounded-md border border-cyan-500/20 backdrop-blur-sm">
                  <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">子分項解析</h3>
                  <div className="h-96">
                    {fullResult?.subScores 
                        ? <RadarChartComponent data={subScoreDataForChart} />
                        : <div className="h-full flex items-center justify-center animate-pulse"><p className="text-gray-500">計算中...</p></div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </section>

          {(status === 'full-complete' || fullResult) && (
            <>
              <section>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">首要修改建議</h3>
                        {fullResult?.diagnostics 
                            ? <div className="space-y-3">{prioritySuggestions.map((item, index) => <PrioritySuggestionCard key={index} item={item} onTimestampClick={handleTimestampClick} />)}</div>
                            : <div className="space-y-3 animate-pulse">
                                <div className="bg-black/30 rounded-md h-[6.5rem] border border-cyan-500/10"></div>
                                <div className="bg-black/30 rounded-md h-[6.5rem] border border-cyan-500/10"></div>
                            </div>
                        }
                    </div>
                     <div>
                        <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">優點分析</h3>
                         {fullResult?.strengths
                            ? <div className="space-y-3">{fullResult.strengths.map((item, index) => <StrengthCard key={index} item={item} />)}</div>
                            : <SkeletonCard className="min-h-[22rem]" />
                        }
                    </div>
                 </div>
              </section>

              <section>
                <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">合規風險深度分析</h3>
                {fullResult?.complianceBreakdown
                    ? <ComplianceReport complianceData={fullResult.complianceBreakdown} onTimestampClick={handleTimestampClick} />
                    : <SkeletonCard className="min-h-[25rem]" />
                }
              </section>

              <section>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">初步分析報告</h3>
                      <div className="flex flex-col space-y-4">
                          {!preliminaryResult ? (
                              <SkeletonCard className="min-h-[10rem]" />
                          ) : (
                              <>
                                  <InfoCard title="核心主題" icon={<BulbIcon className="w-6 h-6 text-yellow-400"/>}>
                                      <p className="text-gray-300">{preliminaryResult.coreTheme || '未能確定核心主題。'}</p>
                                  </InfoCard>
                                  <InfoCard title="影片逐字稿" icon={<FileTextIcon className="w-6 h-6 text-gray-400"/>}>
                                      <div className="bg-gray-900/70 p-4 rounded-sm max-h-60 overflow-y-auto">
                                          <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                                              {preliminaryResult.transcript || '未能生成逐字稿。'}
                                          </p>
                                      </div>
                                  </InfoCard>
                              </>
                          )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">時間軸診斷</h3>
                      {fullResult?.diagnostics
                          ? <div className="space-y-4">
                              {fullResult.diagnostics.map((item, index) => <DiagnosticCard key={index} item={item} onTimestampClick={handleTimestampClick}/>)}
                            </div>
                          : <SkeletonCard className="min-h-[40rem]" />
                      }
                    </div>
                </div>
              </section>

              <section>
                <div>
                    <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-300 tracking-wider">策略改良建議</h3>
                    {fullResult?.improvementPackage
                        ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fullResult.improvementPackage.map(item => (
                                <StrategyCard key={item.type} item={item} />
                            ))}
                          </div>
                        : <SkeletonCard className="min-h-[12rem]" />
                    }
                </div>
              </section>
            </>
          )}

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
