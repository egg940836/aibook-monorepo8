import React, { useState, useMemo } from 'react';
import type { AnalysisHistoryItem } from '../types';
import type { User } from '../services/authService';
import { FilmIcon, PlusIcon, TrashIcon, SpinnerIcon, UploadIcon, XIcon, UserIcon, LogOutIcon, ShieldCheckIcon, SearchIcon, ScaleIcon } from './icons';

interface SidebarProps {
  history: AnalysisHistoryItem[];
  selectedId?: number | null;
  onSelect: (item: AnalysisHistoryItem) => void;
  onDelete: (id: number) => void;
  onAnalysisStart: (file: File) => void;
  onNewAnalysisClick: () => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
  isAdminViewActive: boolean;
  onAdminClick: () => void;
  comparisonList: number[];
  onToggleCompare: (id: number) => void;
  onStartComparison: () => void;
  isComparing: boolean;
}

const getGradeColor = (g?: string) => {
    if (g === 'A') return 'bg-green-500';
    if (g === 'B') return 'bg-cyan-500';
    if (g === 'C') return 'bg-yellow-500';
    if (g === 'D') return 'bg-red-500';
    return 'bg-gray-500';
};

const HistoryItem: React.FC<{ 
    item: AnalysisHistoryItem; 
    isSelected: boolean; 
    isOwner: boolean;
    onSelect: () => void; 
    onDelete: (id: number) => void;
    isInCompareList: boolean;
    onToggleCompare: (id: number) => void;
}> = ({ item, isSelected, isOwner, onSelect, onDelete, isInCompareList, onToggleCompare }) => {
    
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(item.id);
    };

    const handleToggleCompareClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleCompare(item.id);
    };

    const getStatus = () => {
        if (item.status === 'full-complete') {
            return { text: `總分: ${item.totalScore}`, color: getGradeColor(item.grade), icon: null };
        }
        return { text: item.progressMessage || '分析中...', color: 'bg-purple-500', icon: <SpinnerIcon className="w-3 h-3 text-white" /> };
    };

    const { text, color, icon } = getStatus();

    return (
        <li
            onClick={onSelect}
            className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-all duration-200 group relative border ${isSelected ? 'bg-cyan-500/20 border-cyan-500/30' : 'hover:bg-gray-700/50'} ${isInCompareList ? 'border-yellow-400' : 'border-transparent'}`}
        >
            <div className="flex-shrink-0 relative">
                <img src={item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/64/40`} alt={item.videoName} className="w-16 h-10 object-cover rounded-sm bg-gray-700 border border-cyan-500/10" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200 truncate">{item.videoName}</p>
                <div className="flex items-center mt-1 space-x-2">
                    <span className={`flex items-center space-x-1 px-2 py-0.5 text-xs font-bold text-white rounded-sm ${color}`}>
                        {icon}
                        <span>{text}</span>
                    </span>
                    <p className="text-xs text-gray-400 truncate" title={new Date(item.date).toLocaleString('zh-TW')}>
                        {new Date(item.date).toLocaleDateString('zh-TW')}
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 right-2 -translate-y-1/2">
                {isOwner && (
                    <button
                        onClick={handleDeleteClick}
                        className="p-1.5 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                        aria-label="Delete analysis"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
                {item.status === 'full-complete' && (
                     <button
                        onClick={handleToggleCompareClick}
                        className={`p-1.5 rounded-full ${isInCompareList ? 'text-yellow-400 bg-yellow-500/20' : 'text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-400'}`}
                        aria-label="Select for comparison"
                    >
                        <ScaleIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </li>
    );
};

const GradeFilter: React.FC<{ activeFilter: string | null, onFilterChange: (grade: string | null) => void }> = ({ activeFilter, onFilterChange }) => {
    const grades = ['A', 'B', 'C', 'D'];
    return (
        <div className="flex items-center justify-around bg-gray-800/50 p-1 rounded-md">
            <button 
                onClick={() => onFilterChange(null)}
                className={`px-3 py-1 text-xs font-bold rounded-sm transition-colors w-full ${!activeFilter ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            >
                全部
            </button>
            {grades.map(grade => (
                <button 
                    key={grade}
                    onClick={() => onFilterChange(grade)}
                    className={`px-3 py-1 text-xs font-bold rounded-sm transition-colors w-full ${activeFilter === grade ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    {grade}
                </button>
            ))}
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ history, selectedId, onSelect, onDelete, onAnalysisStart, onNewAnalysisClick, isOpen, onClose, currentUser, onLogout, isAdminViewActive, onAdminClick, comparisonList, onToggleCompare, onStartComparison, isComparing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
        const matchesSearch = item.videoName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = !activeFilter || (item.grade === activeFilter && item.status === 'full-complete');
        return matchesSearch && matchesFilter;
    });
  }, [history, searchTerm, activeFilter]);
  
  const { myAnalyses, publicAnalyses } = useMemo(() => {
    const myAnalyses = filteredHistory.filter(item => item.uploaderId === currentUser.id);
    const publicAnalyses = filteredHistory.filter(item => item.isPublic && item.uploaderId !== currentUser.id);
    return { myAnalyses, publicAnalyses };
  }, [filteredHistory, currentUser.id]);

  const handleDragEvents = (e: React.DragEvent<HTMLElement>, dragging: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(dragging);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.type.startsWith('video/')) {
            onAnalysisStart(droppedFile);
        } else {
            alert("檔案格式不符：請上傳影片檔案 (MP4, MOV)。");
        }
    }
  };
  
  const renderHistoryList = (list: AnalysisHistoryItem[], isOwnerList: boolean) => (
      <ul className="space-y-1">
        {list.map(item => (
            <HistoryItem 
                key={item.id}
                item={item} 
                isSelected={!isComparing && item.id === selectedId}
                isOwner={isOwnerList}
                onSelect={() => onSelect(item)}
                onDelete={onDelete}
                isInCompareList={comparisonList.includes(item.id)}
                onToggleCompare={onToggleCompare}
            />
        ))}
      </ul>
  );

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-20 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>
      <aside 
        className={`fixed lg:relative inset-y-0 left-0 w-80 bg-gray-900/70 backdrop-blur-sm border-r border-cyan-500/20 flex flex-col h-full z-30 transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${isDragging ? 'border-r-2 border-cyan-400' : ''}`}
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-cyan-500/20 backdrop-blur-sm z-20 flex flex-col items-center justify-center pointer-events-none rounded-r-lg">
              <UploadIcon className="w-16 h-16 text-cyan-300 mb-4"/>
              <p className="text-lg font-bold text-cyan-200">放開以開始分析</p>
          </div>
        )}

        <div className="p-4 border-b border-cyan-500/20 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <FilmIcon className="w-8 h-8 text-cyan-400"/>
                    <h1 className="text-xl font-bold text-white tracking-wider">
                        AI 影片分析
                    </h1>
                </div>
                <button onClick={onClose} className="p-2 rounded-full lg:hidden hover:bg-gray-700 -mr-2">
                    <XIcon className="w-5 h-5"/>
                </button>
            </div>
            <button
                onClick={onNewAnalysisClick}
                className="w-full flex items-center justify-center space-x-2 bg-cyan-600 text-white font-bold py-2.5 px-4 rounded-md shadow-lg hover:bg-cyan-500 transition-colors duration-300 border border-cyan-400"
            >
                <PlusIcon className="w-5 h-5" />
                <span>新增分析</span>
            </button>
            <button
                onClick={onStartComparison}
                disabled={comparisonList.length !== 2}
                className="w-full flex items-center justify-center space-x-2 bg-yellow-600 text-white font-bold py-2.5 px-4 rounded-md shadow-lg hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 border border-yellow-400 disabled:border-gray-500"
            >
                <ScaleIcon className="w-5 h-5" />
                <span>比較分析結果 ({comparisonList.length}/2)</span>
            </button>
        </div>
        
        <div className="p-2 border-b border-cyan-500/20">
             <div className="relative mb-2">
                <input 
                    type="text"
                    placeholder="搜尋影片名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-md py-1.5 pl-8 pr-2 text-sm text-gray-300 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
             </div>
             <GradeFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
              <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">我的分析</h2>
              {myAnalyses.length > 0 ? (
                renderHistoryList(myAnalyses, true)
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">無符合條件的分析。</p>
                </div>
              )}
          </div>
          <div>
              <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">公開分析</h2>
              {publicAnalyses.length > 0 ? (
                renderHistoryList(publicAnalyses, false)
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">尚無符合條件的公開分析。</p>
                </div>
              )}
          </div>
          {currentUser.role === 'admin' && (
            <div>
                <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">管理工具</h2>
                <button
                    onClick={onAdminClick}
                    className={`w-full flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-all duration-200 group relative border border-transparent ${isAdminViewActive && !isComparing ? 'bg-cyan-500/20 border-cyan-500/30' : 'hover:bg-gray-700/50'}`}
                >
                    <ShieldCheckIcon className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-semibold text-gray-200">管理後台</span>
                </button>
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-cyan-500/20">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                    <UserIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300 font-semibold truncate">{currentUser.name}</span>
                </div>
                <button onClick={onLogout} className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white" title="登出">
                    <LogOutIcon className="w-5 h-5"/>
                </button>
             </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
