import React, { useState, useEffect, useCallback } from 'react';
import type { AnalysisHistoryItem } from '../types';
import * as analysisService from '../services/analysisService';
import { SpinnerIcon, AlertTriangleIcon, TrashIcon, EyeIcon, EyeOffIcon, FilmIcon } from './icons';

interface AdminDashboardProps {
  onAdminDelete: (id: number) => Promise<void>;
}

const getStatusBadge = (status: AnalysisHistoryItem['status']) => {
    switch (status) {
        case 'analyzing-preliminary':
        case 'preliminary-complete':
        case 'analyzing-full':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-purple-500/20 text-purple-300"><SpinnerIcon className="w-3 h-3 mr-1"/>分析中</span>;
        case 'full-complete':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-green-500/20 text-green-300">已完成</span>;
        default:
            return <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-gray-500/20 text-gray-300">未知</span>;
    }
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onAdminDelete }) => {
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analysisService.getAllAnalysesForAdmin();
      setAnalyses(data);
    } catch (err) {
      setError('無法載入分析資料，請稍後再試。');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (window.confirm('您確定要從系統中永久刪除這份分析報告嗎？此操作無法復原。')) {
      try {
        await onAdminDelete(id);
        setAnalyses(prev => prev.filter(item => item.id !== id));
      } catch (err) {
          alert("刪除失敗，請稍後再試。");
          console.error("Admin delete failed:", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <SpinnerIcon className="w-8 h-8 text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md flex items-center">
          <AlertTriangleIcon className="w-5 h-5 mr-3" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="p-4 bg-gray-900/50 rounded-full border border-cyan-500/20 mb-4">
                <FilmIcon className="w-12 h-12 text-cyan-400"/>
            </div>
            <h2 className="text-2xl font-bold text-white">無分析紀錄</h2>
            <p className="text-gray-500 mt-2">系統中目前沒有任何分析報告。</p>
        </div>
    );
  }

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-cyan-500/20 p-4 sm:p-6 rounded-lg h-full overflow-y-auto">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cyan-500/20">
                <thead className="bg-black/30">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">影片名稱</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">上傳者</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">分析日期</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">狀態</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider">可見度</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-cyan-300 uppercase tracking-wider">操作</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                {analyses.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-800/40">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-200 truncate max-w-xs">{item.videoName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{item.uploaderName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.isPublic ? (
                            <EyeIcon className="w-5 h-5 text-green-400 mx-auto" title="公開" />
                        ) : (
                            <EyeOffIcon className="w-5 h-5 text-gray-500 mx-auto" title="私有" />
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDelete(item.id)} className="p-2 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400" aria-label="Delete analysis">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default AdminDashboard;
