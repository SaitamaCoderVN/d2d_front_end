'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  id: string;
  type: 'deposit' | 'deploy';
  address: string;
  amount: number;
  timestamp: number;
}

const MOCK_NEWS: NewsItem[] = [
  { id: '1', type: 'deposit', address: '8xrt...9jkL', amount: 150.5, timestamp: Date.now() - 1000 * 60 * 5 },
  { id: '2', type: 'deploy', address: '3nmP...4x2Q', amount: 25.0, timestamp: Date.now() - 1000 * 60 * 15 },
  { id: '3', type: 'deposit', address: '9yHk...2m1N', amount: 500.0, timestamp: Date.now() - 1000 * 60 * 30 },
  { id: '4', type: 'deploy', address: '5pLq...7z3W', amount: 12.5, timestamp: Date.now() - 1000 * 60 * 45 },
  { id: '5', type: 'deposit', address: '2wRr...8v4K', amount: 50.0, timestamp: Date.now() - 1000 * 60 * 60 },
];

export default function PoolNewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    // Simulating fetching news from an API or on-chain history
    // Ideally this would come from your indexer or on-chain event logs
    setNews(MOCK_NEWS);
  }, []);

  return (
    <div className="w-full bg-[#0f172a] border-t border-slate-800 overflow-hidden h-10 flex items-center fixed bottom-0 left-0 z-40 md:pl-64">
      <div className="flex items-center gap-2 px-4 border-r border-slate-800 bg-[#0f172a] h-full z-10">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider whitespace-nowrap">Live Feed</span>
      </div>
      
      <div className="flex-1 overflow-hidden relative flex items-center">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
          {/* Double the content for seamless loop */}
          {[...news, ...news, ...news].map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-2 text-xs font-mono">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                item.type === 'deposit' 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {item.type === 'deposit' ? 'DEPOSIT' : 'DEPLOY'}
              </span>
              <span className="text-slate-300">{item.address}</span>
              <span className="text-slate-500">
                {item.type === 'deposit' ? 'staked' : 'borrowed'}
              </span>
              <span className={item.type === 'deposit' ? 'text-blue-400' : 'text-purple-400'}>
                {item.amount.toFixed(2)} SOL
              </span>
              <span className="text-slate-600 text-[10px]">
                {Math.floor((Date.now() - item.timestamp) / 60000)}m ago
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

