import React from 'react';
import { FilmIcon, AlertTriangleIcon, PlusIcon } from './icons';

interface DashboardProps {
  error?: string | null;
  onNewAnalysisClick: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ error, onNewAnalysisClick }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div 
        className="bg-black/30 backdrop-blur-sm border border-cyan-500/20 p-6 sm:p-10 rounded-lg shadow-[0_0_25px_rgba(56,189,248,0.2)] max-w-2xl w-full relative"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gray-900/50 rounded-full border border-cyan-500/20">
             <FilmIcon className="w-12 h-12 text-cyan-400"/>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-widest">AI 廣告影片分析平台</h1>
        <p className="text-md sm:text-lg text-gray-400 mb-8">
          歡迎！點擊側邊欄或下方按鈕以開始新的分析。
        </p>
        
        <div className="flex justify-center mb-8">
            <button
                onClick={onNewAnalysisClick}
                className="flex items-center justify-center space-x-2 bg-cyan-600 text-white font-bold py-3 px-6 rounded-md shadow-lg hover:bg-cyan-500 transition-colors duration-300 transform hover:scale-105 border border-cyan-400"
            >
                <PlusIcon className="w-5 h-5" />
                <span>新增分析</span>
            </button>
        </div>

        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md relative flex items-center w-full text-left">
                <AlertTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{error}</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
