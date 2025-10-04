import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ResultsDashboard from './components/ResultsDashboard';
import Header from './components/Header';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ComparisonDashboard from './components/ComparisonDashboard';
import AnalysisOptionsModal from './components/AnalysisOptionsModal';
import * as authService from './services/authService';
import * as analysisService from './services/analysisService';
import type { User } from './services/authService';
import type { AnalysisHistoryItem } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminViewActive, setIsAdminViewActive] = useState(false);
  const [comparisonList, setComparisonList] = useState<number[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isFileOptionsModalOpen, setIsFileOptionsModalOpen] = useState(false);
  const [fileToAnalyze, setFileToAnalyze] = useState<File | null>(null);
  
  useEffect(() => {
    const verifySession = async () => {
      const user = await authService.validateToken();
      if (user) {
        setCurrentUser(user);
      }
      setIsAuthLoading(false);
    };
    verifySession();
  }, []);

  const fetchHistory = useCallback(async () => {
    if (currentUser) {
      try {
        setError(null);
        const analyses = await analysisService.getAnalyses();
        setHistory(analyses);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("無法載入分析紀錄。");
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchHistory();
    } else {
      setHistory([]);
      setSelectedAnalysis(null);
      setIsAdminViewActive(false);
      setIsComparing(false);
      setComparisonList([]);
    }
  }, [currentUser, fetchHistory]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };
  
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    window.location.reload();
  };

  const handleNewAnalysisClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileToAnalyze(e.target.files[0]);
      setIsFileOptionsModalOpen(true);
      e.target.value = ''; 
    }
  };
  
  const handleConfirmAnalysisStart = async (model: string) => {
    if (fileToAnalyze && currentUser) {
      setIsAdminViewActive(false);
      setIsSidebarOpen(false);
      setError(null);
      setSelectedAnalysis(null);
      setIsComparing(false);
      setComparisonList([]);
      
      try {
        const newAnalysisTask = await analysisService.createAnalysis(fileToAnalyze.name, model);
        const newAnalysisWithFile: AnalysisHistoryItem = {
            ...newAnalysisTask,
            videoFile: fileToAnalyze,
        }
        setHistory(prev => [newAnalysisWithFile, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setSelectedAnalysis(newAnalysisWithFile);

      } catch (err) {
        console.error("Failed to start analysis:", err);
        setError("建立分析任務失敗，請稍後再試。");
      }
    }
    setIsFileOptionsModalOpen(false);
    setFileToAnalyze(null);
  };

  const handleSelectHistory = useCallback((item: AnalysisHistoryItem) => {
    setIsAdminViewActive(false);
    setIsComparing(false);
    setComparisonList([]);
    if (history.find(h => h.id === item.id)) {
      setSelectedAnalysis(item);
      setError(null);
      setIsSidebarOpen(false);
    }
  }, [history]);
  
  const handleDeleteHistory = useCallback(async (idToDelete: number) => {
    await analysisService.deleteAnalysis(idToDelete);
    await fetchHistory();
    if (selectedAnalysis?.id === idToDelete) {
        setSelectedAnalysis(null);
    }
    setComparisonList(prev => prev.filter(id => id !== idToDelete));
  }, [selectedAnalysis, fetchHistory]);
  
  const handleAdminDeleteHistory = useCallback(async (idToDelete: number) => {
    await analysisService.deleteAnalysisForAdmin(idToDelete);
    await fetchHistory();
     if (selectedAnalysis?.id === idToDelete) {
        setSelectedAnalysis(null);
    }
    setComparisonList(prev => prev.filter(id => id !== idToDelete));
  }, [selectedAnalysis, fetchHistory]);
  
  const handleAdminClick = () => {
      setSelectedAnalysis(null);
      setIsComparing(false);
      setComparisonList([]);
      setIsAdminViewActive(true);
      setIsSidebarOpen(false);
  };
  
  const handleTogglePublic = useCallback(async (id: number, isPublic: boolean) => {
    await analysisService.updateAnalysis(id, { isPublic });
    await fetchHistory();
    
    if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(prev => prev ? {...prev, isPublic} : null);
    }
  }, [selectedAnalysis, fetchHistory]);

  const handleToggleCompare = useCallback((id: number) => {
    setComparisonList(prev => {
        const item = history.find(i => i.id === id);
        if (!item) return prev;

        if (prev.includes(id)) {
            return prev.filter(item => item !== id);
        }
        if (prev.length < 2) {
            return [...prev, id];
        }
        return prev;
    });
  }, [history]);

  const handleStartComparison = () => {
    if (comparisonList.length === 2) {
        setIsComparing(true);
        setSelectedAnalysis(null);
        setIsAdminViewActive(false);
        setIsSidebarOpen(false);
    }
  };

  const handleExitComparison = () => {
      setIsComparing(false);
      setComparisonList([]);
  };

  const getHeaderTitle = () => {
    if (isComparing) {
        return 'A/B 比較模式';
    }
    if (isAdminViewActive) {
        return '管理後台';
    }
    if (selectedAnalysis) {
        if (selectedAnalysis.videoName.length > 25) {
            return `${selectedAnalysis.videoName.substring(0, 22)}...`;
        }
        return selectedAnalysis.videoName;
    }
    return 'AI 廣告影片分析平台';
  };

  const renderContent = () => {
    if (isComparing && comparisonList.length === 2) {
        const itemA = history.find(item => item.id === comparisonList[0]);
        const itemB = history.find(item => item.id === comparisonList[1]);
        if (itemA && itemB) {
            return <ComparisonDashboard itemA={itemA} itemB={itemB} onExit={handleExitComparison} />;
        }
        handleExitComparison();
        return <Dashboard error="無法載入比較項目。" onNewAnalysisClick={handleNewAnalysisClick} />;
    }
    if (isAdminViewActive) {
        return <AdminDashboard onAdminDelete={handleAdminDeleteHistory} />;
    }
    if (selectedAnalysis) {
      return <ResultsDashboard 
        key={selectedAnalysis.id} 
        analysisItem={selectedAnalysis} 
        currentUser={currentUser!}
        onTogglePublic={handleTogglePublic}
      />;
    }
    return <Dashboard error={error} onNewAnalysisClick={handleNewAnalysisClick} />;
  };
  
  if (isAuthLoading) {
    return <div className="bg-gray-900 h-screen w-screen"></div>;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }


  return (
    <>
      <AnalysisOptionsModal 
        isOpen={isFileOptionsModalOpen}
        onClose={() => setIsFileOptionsModalOpen(false)}
        onStartAnalysis={handleConfirmAnalysisStart}
        file={fileToAnalyze}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/mp4,video/mov"
        className="hidden"
      />
      <div className="flex h-screen bg-gray-900 text-gray-200 font-mono">
        <Sidebar 
          history={history} 
          selectedId={selectedAnalysis?.id}
          onSelect={handleSelectHistory} 
          onDelete={handleDeleteHistory}
          onAnalysisStart={(file) => {
            setFileToAnalyze(file);
            setIsFileOptionsModalOpen(true);
          }}
          onNewAnalysisClick={handleNewAnalysisClick}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
          isAdminViewActive={isAdminViewActive}
          onAdminClick={handleAdminClick}
          comparisonList={comparisonList}
          onToggleCompare={handleToggleCompare}
          onStartComparison={handleStartComparison}
          isComparing={isComparing}
        />
        <main className="flex-1 flex flex-col overflow-y-auto">
          <Header onMenuClick={() => setIsSidebarOpen(true)} title={getHeaderTitle()} />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
              {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;
