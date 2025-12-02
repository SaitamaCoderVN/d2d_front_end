'use client';

import { useEffect, useRef, useState } from 'react';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  hash?: string; // For transaction hashes
}

interface TerminalViewProps {
  logs: LogEntry[];
  title?: string;
  height?: string;
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function TerminalView({ 
  logs, 
  title = 'TERMINAL Output', 
  height = 'h-64',
  className = '',
  isCollapsed: propIsCollapsed,
  onToggle
}: TerminalViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed;
  const handleToggle = onToggle || (() => setInternalCollapsed(!internalCollapsed));

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current && !isCollapsed) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isCollapsed]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    });
  };

  return (
    <div className={`border border-slate-800 bg-black rounded-md font-mono text-sm flex flex-col shadow-2xl shadow-emerald-900/5 overflow-hidden transition-all duration-300 ${isCollapsed ? 'h-10' : height} ${className}`}>
      {/* Window Header */}
      <div 
        className="flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-[#0f172a] cursor-pointer hover:bg-[#1e293b] transition-colors select-none"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
          </div>
          <span className="text-xs text-slate-500 font-medium ml-2 tracking-wider uppercase flex items-center gap-2">
            {title}
            {logs.length > 0 && (
              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                {logs.length}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] text-slate-500">
            {isCollapsed ? 'CLICK TO EXPAND' : 'CLICK TO COLLAPSE'}
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setAutoScroll(!autoScroll);
            }}
            className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
              autoScroll 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {autoScroll ? 'SCROLL: ON' : 'SCROLL: OFF'}
          </button>
          <svg 
            className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Logs Area */}
      <div className={`flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent transition-opacity duration-200 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">> System ready. Waiting for commands...</div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-3 hover:bg-white/5 -mx-2 px-2 py-0.5 rounded transition-colors group">
                <span className="text-slate-600 shrink-0 select-none text-[10px] pt-0.5">[{formatTime(log.timestamp)}]</span>
                <div className="flex-1 break-all">
                  <span className="text-slate-500 mr-2 select-none">$</span>
                  <span className={getLevelColor(log.level)}>{log.message}</span>
                  {log.hash && (
                    <a 
                      href={`https://explorer.solana.com/tx/${log.hash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 ml-2 text-[10px] text-blue-400 hover:text-blue-300 underline bg-blue-900/20 px-1.5 rounded border border-blue-500/30"
                    >
                      <span>TX: {log.hash.slice(0, 8)}...</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Blinking Cursor */}
        <div className="mt-2 flex items-center text-emerald-500" ref={bottomRef}>
          <span className="mr-2 text-slate-500">$</span>
          <span className="animate-pulse bg-emerald-500 w-2 h-4 inline-block align-middle"></span>
        </div>
      </div>
    </div>
  );
}
