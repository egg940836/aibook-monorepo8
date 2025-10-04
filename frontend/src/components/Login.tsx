import React, { useState } from 'react';
import { FilmIcon, SpinnerIcon, AlertTriangleIcon } from './icons';
import * as authService from '../services/authService';
import type { User } from '../services/authService';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('user-123');
  const [password, setPassword] = useState('demo');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await authService.login(username, password);
      onLoginSuccess(user);
    } catch (err) {
      setError("登入失敗：" + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-black/30 backdrop-blur-sm border border-cyan-500/20 rounded-lg shadow-[0_0_25px_rgba(56,189,248,0.1)]">
        <div className="text-center">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-900/50 rounded-full border border-cyan-500/20">
                    <FilmIcon className="w-10 h-10 text-cyan-400"/>
                </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-widest">AI 影片分析平台</h1>
            <p className="mt-2 text-gray-400">請登入以繼續</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block mb-2 text-sm font-medium text-gray-400"
            >
              使用者 ID
            </label>
            <input
              type="text"
              name="username"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-gray-200 bg-gray-800/50 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block mb-2 text-sm font-medium text-gray-400"
            >
              密碼
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-gray-200 bg-gray-800/50 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
              required
            />
          </div>

          {error && (
            <div className="flex items-center p-3 text-sm text-red-300 bg-red-900/50 border border-red-700 rounded-md">
              <AlertTriangleIcon className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <SpinnerIcon className="w-5 h-5" />
              ) : (
                '登入'
              )}
            </button>
          </div>
        </form>
         <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700/50">
            <p className="mb-1">使用者測試帳號: <span className="font-semibold text-gray-400">user-123</span> / <span className="font-semibold text-gray-400">demo</span></p>
            <p>管理員測試帳號: <span className="font-semibold text-cyan-400/80">admin-001</span> / <span className="font-semibold text-cyan-400/80">admin</span></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
