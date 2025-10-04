import React, { useMemo } from 'react';
import type { AnalysisHistoryItem } from '../types';
import { SUB_SCORE_DETAILS } from '../constants';
import { ColumnsIcon, XIcon } from './icons';
import RadarChartComponent from './RadarChartComponent';

interface ComparisonDashboardProps {
  itemA: AnalysisHistoryItem;
  itemB: AnalysisHistoryItem;
  onExit: () => void;
}

const ScoreCard: React.FC<{ score?: number, grade?: string, title: string }> = ({ score, grade, title }) => {
    const getGradeColor = (g?: string) => {
        if (g === 'A') return 'text-green-400';
        if (g === 'B') return 'text-cyan-400';
        if (g === 'C') return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-black/30 p-4 rounded-md border border-cyan-500/20 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-gray-300 truncate mb-2" title={title}>{title}</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="border-r border-cyan-500/20 pr-4">
                    <p className="text-xs text-cyan-400/70 mb-1">總分</p>
                    <p className={`text-4xl font-bold ${getGradeColor(grade)}`}>{score ?? 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-cyan-400/70 mb-1">評級</p>
                    <p className={`text-4xl font-bold ${getGradeColor(grade)}`}>{grade ?? 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};

const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({ itemA, itemB, onExit }) => {
  const videoUrlA = useMemo(() => itemA.videoUrl || (itemA.videoFile ? URL.createObjectURL(itemA.videoFile) : ''), [itemA.videoUrl, itemA.videoFile]);
  const videoUrlB = useMemo(() => itemB.videoUrl || (itemB.videoFile ? URL.createObjectURL(itemB.videoFile) : ''), [itemB.videoUrl, itemB.videoFile]);

  const mergedRadarData = useMemo(() => {
    const allKeys = Array.from(new Set([
        ...Object.keys(itemA.fullResult?.subScores || {}),
        ...Object.keys(itemB.fullResult?.subScores || {})
    ]));
    
    return allKeys.map(key => ({
      subject: SUB_SCORE_DETAILS[key]?.name.split(' ')[0] || key,
      scoreA: itemA.fullResult?.subScores?.[key] || 0,
      scoreB: itemB.fullResult?.subScores?.[key] || 0,
      fullMark: 100,
    }));
  }, [itemA, itemB]);

  const getScoreDiff = (scoreA?: number, scoreB?: number) => {
    if (scoreA === undefined || scoreB === undefined) return { text: 'N/A', color: 'text-gray-400' };
    const diff = scoreA - scoreB;
    if (diff > 0) return { text: `+${diff}`, color: 'text-green-400' };
    if (diff < 0) return { text: `${diff}`, color: 'text-red-400' };
    return { text: '0', color: 'text-gray-400' };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
            <ColumnsIcon className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">A/B 比較分析</h2>
        </div>
        <button onClick={onExit} className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-sm">
            <XIcon className="w-4 h-4" />
            <span>結束比較</span>
        </button>
      </div>
      <div className="flex-grow overflow-y-auto space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-md border border-cyan-500/20 shadow-[0_0_15px_rgba(56,189,248,0.2)] bg-black aspect-[9/16] w-full max-w-sm mx-auto">
              <video src={videoUrlA} controls className="w-full h-full object-cover" key={videoUrlA}></video>
            </div>
            <ScoreCard score={itemA.totalScore} grade={itemA.grade} title={itemA.videoName} />
          </div>
          <div className="space-y-4">
             <div className="relative overflow-hidden rounded-md border border-yellow-500/20 shadow-[0_0_15px_rgba(250,204,21,0.2)] bg-black aspect-[9/16] w-full max-w-sm mx-auto">
              <video src={videoUrlB} controls className="w-full h-full object-cover" key={videoUrlB}></video>
            </div>
            <ScoreCard score={itemB.totalScore} grade={itemB.grade} title={itemB.videoName} />
          </div>
        </section>

        <section className="bg-black/30 p-6 rounded-md border border-cyan-500/20 backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-4 text-cyan-300">子分項疊加比較</h3>
            <div className="h-96">
                <RadarChartComponent
                    data={mergedRadarData}
                    nameA={itemA.videoName}
                    nameB={itemB.videoName}
                />
            </div>
        </section>
        
        <section className="bg-black/30 p-4 sm:p-6 rounded-md border border-cyan-500/20 backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-4 text-cyan-300">分數詳情對比</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cyan-500/20">
                    <thead>
                        <tr>
                            <th className="py-3 pr-3 text-left text-sm font-semibold text-cyan-300">評分項目</th>
                            <th className="px-3 py-3 text-center text-sm font-semibold text-cyan-300 truncate max-w-[150px]">{itemA.videoName}</th>
                            <th className="px-3 py-3 text-center text-sm font-semibold text-cyan-300 truncate max-w-[150px]">{itemB.videoName}</th>
                            <th className="pl-3 py-3 text-right text-sm font-semibold text-cyan-300">差異</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {mergedRadarData.map(row => {
                            const diff = getScoreDiff(row.scoreA, row.scoreB);
                            return (
                                <tr key={row.subject}>
                                    <td className="py-4 pr-3 text-sm font-medium text-gray-200">{row.subject}</td>
                                    <td className="px-3 py-4 text-center text-sm text-cyan-400">{row.scoreA}</td>
                                    <td className="px-3 py-4 text-center text-sm text-yellow-400">{row.scoreB}</td>
                                    <td className={`pl-3 py-4 text-right text-sm font-bold ${diff.color}`}>{diff.text}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
      </div>
    </div>
  );
};

export default ComparisonDashboard;
