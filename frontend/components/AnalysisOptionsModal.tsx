import React, { useState, useEffect } from 'react';
import { FilmIcon, XIcon, ZapIcon } from './icons';

interface AnalysisOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAnalysis: (model: string) => void;
  file: File | null;
}

const AnalysisOptionsModal: React.FC<AnalysisOptionsModalProps> = ({ isOpen, onClose, onStartAnalysis, file }) => {
  const [selectedModel, setSelectedModel] = useState('Gemini 2.5 Flash - 標準版');
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.preload = 'metadata';

      const generateThumbnail = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          setThumbnail(canvas.toDataURL('image/jpeg'));
          URL.revokeObjectURL(video.src);
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2); // Seek to 1s or middle
      };

      video.onseeked = generateThumbnail;

      // Fallback for browsers that don't fire onseeked reliably
      const timer = setTimeout(() => {
          if (!thumbnail) {
              generateThumbnail();
          }
      }, 2000);

      return () => clearTimeout(timer);

    } else {
      setThumbnail(null);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartAnalysis(selectedModel);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-cyan-500/20 rounded-lg shadow-2xl w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-700">
          <XIcon className="w-5 h-5" />
        </button>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">分析選項</h2>
          <div className="flex space-x-4 mb-6">
            <div className="flex-shrink-0 w-24 h-40 bg-gray-800 rounded-md overflow-hidden border border-cyan-500/10">
              {thumbnail ? <img src={thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full"><FilmIcon className="w-8 h-8 text-gray-500" /></div>}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm text-gray-400">檔案名稱</p>
              <p className="font-semibold text-gray-200 break-words">{file.name}</p>
              <p className="text-sm text-gray-400 mt-2">檔案大小</p>
              <p className="font-semibold text-gray-200">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="model-select" className="flex items-center mb-2 text-sm font-medium text-gray-300">
                <ZapIcon className="w-4 h-4 mr-2 text-cyan-400" />
                選擇分析模型
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option>Gemini 2.5 Flash - 標準版</option>
                <option disabled>未來模型 - 創意特化版 (即將推出)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-cyan-600 text-white font-bold py-2.5 px-4 rounded-md shadow-lg hover:bg-cyan-500 transition-colors duration-300 border border-cyan-400"
            >
              開始分析
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AnalysisOptionsModal;
