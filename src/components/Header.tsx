'use client';

import WalletWithPoints from './WalletWithPoints';
import { useUserMode } from '@/context/UserModeContext';

export default function Header() {
  const { mode, setMode } = useUserMode();

  return (
    <header className="hidden md:flex h-16 border-b border-slate-800 bg-[#0B0E14]/80 backdrop-blur-sm items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      {/* Left side - can be used for breadcrumbs or page title in the future */}
      <div className="flex-1"></div>
      
      {/* Right side - Wallet and Points */}
      <div className="flex items-center gap-4">
        {/* Mode Switcher */}
        <div className="flex p-1 bg-slate-900/50 rounded-lg border border-slate-800 mr-2">
          <button
              onClick={() => {
                setMode('developer');
                window.location.href = '/developer';
              }}
            className={`py-1.5 px-3 text-[10px] font-mono font-bold rounded-md transition-all duration-200 ${
              mode === 'developer'
                ? 'bg-blue-500/10 text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            DEV
          </button>
          <button
            onClick={() => {
              setMode('backer');
              window.location.href = '/backer';
            }}
            className={`py-1.5 px-3 text-[10px] font-mono font-bold rounded-md transition-all duration-200 ${
              mode === 'backer'
                ? 'bg-purple-500/10 text-purple-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            BACKER
          </button>
        </div>

        <WalletWithPoints />
      </div>
    </header>
  );
}
