'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import WalletWithPoints from './WalletWithPoints';

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    {
      label: 'HOME',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      label: 'DEVELOPER_CONSOLE',
      href: '/developer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'LIQUIDITY_POOL',
      href: '/backer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'LEADERBOARD',
      href: '/leaderboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const SidebarContent = () => (
    <>
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-[#0B0E14] flex-shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8">
            <Image src="/favicon.svg" alt="D2D" fill className="object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-lg text-slate-200 group-hover:text-emerald-400 transition-colors">D2D_PROTO</span>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Devnet v0.1</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-mono text-slate-500 px-4 mb-4 uppercase tracking-widest">Main Modules</div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md font-mono text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:translate-x-1'
              }`}
            >
              <span className={`${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {item.icon}
              </span>
              <span className="tracking-wide">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
              )}
            </Link>
          );
        })}

        {/* System Status */}
        <div className="mt-12 px-4">
          <div className="text-xs font-mono text-slate-500 mb-4 uppercase tracking-widest">System Status</div>
          <div className="bg-slate-900/50 rounded border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">NETWORK</span>
              <span className="text-emerald-400">DEVNET</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">UPTIME</span>
              <span className="text-slate-200">99.9%</span>
            </div>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-emerald-500 w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-[#0B0E14] border-b border-slate-800 z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-6 h-6">
            <Image src="/favicon.svg" alt="D2D" fill className="object-contain" />
          </div>
          <span className="font-mono font-bold text-slate-200">D2D_PROTO</span>
        </Link>
        
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Wallet Button - Top Right (Mobile Only) */}
      <div className="md:hidden fixed top-[14px] right-14 z-50">
        <WalletWithPoints className="flex items-center space-x-2 scale-75 origin-right" />
      </div>

      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-obsidian border-r border-slate-800 flex-col z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <aside className="absolute top-0 left-0 h-full w-64 bg-[#0B0E14] border-r border-slate-800 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-500 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
