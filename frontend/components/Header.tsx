import React from 'react';
import { MenuIcon } from './icons';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  return (
    <header className="lg:hidden sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10 p-4 border-b border-cyan-500/20 flex items-center">
      <button onClick={onMenuClick} className="mr-4 p-2 rounded-md hover:bg-gray-700 -ml-2">
        <MenuIcon className="w-6 h-6 text-gray-300" />
      </button>
      <h1 className="text-lg font-bold text-white tracking-wider truncate pr-4">{title}</h1>
    </header>
  );
};

export default Header;
