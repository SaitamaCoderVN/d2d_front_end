'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import WalletWithPoints from './WalletWithPoints';
import { useUserMode } from '@/context/UserModeContext';
import { useTheme } from '@/context/ThemeContext';

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { mode } = useUserMode();
  const { theme, toggleTheme } = useTheme();

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
      label: 'DEPLOYMENT',
      href: '/developer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      visible: 'developer'
    },
    {
      label: 'PROGRAMS',
      href: '/developer/programs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      visible: 'developer'
    },
    {
      label: 'LIQUIDITY_POOL',
      href: '/backer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      visible: 'backer'
    },
    {
      label: 'STAKE',
      href: '/backer/stake',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      visible: 'backer'
    },
    {
      label: 'REWARDS',
      href: '/backer/rewards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
      visible: 'backer'
    },
    {
      label: 'UN STAKE',
      href: '/backer/unstake',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
      visible: 'backer'
    },
    {
      label: 'LEADERBOARD',
      href: '/leaderboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      visible: 'backer'
    }
  ];

  const filteredNavItems = navItems.filter(item => item.visible === 'all' || item.visible === mode);

  const SidebarContent = () => (
    <>
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-[#0B0E14] flex-shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8">
            <Image src="/favicon.svg" alt="D2D" fill className="object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-lg text-slate-200 group-hover:text-blue-400 transition-colors">D2D</span>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Devnet v0.1</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-mono text-slate-500 px-4 mb-4 uppercase tracking-widest">Main Modules</div>
        
        {filteredNavItems.map((item) => {
          // For exact match or nested routes, but handle /developer specially
          let isActive = pathname === item.href;
          if (!isActive && pathname?.startsWith(item.href + '/')) {
            // Only match nested routes if the href doesn't conflict with another route
            // Special case: /developer should not match /developer/programs
            if (item.href === '/developer' && pathname.startsWith('/developer/programs')) {
              isActive = false;
            } else {
              isActive = true;
            }
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md font-mono text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59, 130, 246,0.1)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:translate-x-1'
              }`}
            >
              <span className={`${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {item.icon}
              </span>
              <span className="tracking-wide">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_#60a5fa]" />
              )}
            </Link>
          );
        })}

      </nav>

      {/* Theme Toggle Button - Bottom Left */}
      <div className="flex-shrink-0 p-4 border-t border-slate-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md font-mono text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Light Mode</span>
            </>
          )}
        </button>
      </div>
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
          <span className="font-mono font-bold text-slate-200">D2D</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <WalletWithPoints className="flex items-center space-x-2" />
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
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
