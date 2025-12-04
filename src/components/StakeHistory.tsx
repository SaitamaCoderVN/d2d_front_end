'use client';

import { useState, useEffect } from 'react';

interface StakeEvent {
  id: string;
  amount: number;
  txHash: string;
  timestamp: number;
  status: 'confirmed' | 'pending';
}

const MOCK_STAKE_HISTORY: StakeEvent[] = [
  { id: '1', amount: 50.0, txHash: '2xK9...8jLq', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, status: 'confirmed' },
  { id: '2', amount: 10.5, txHash: '5mN2...9pQr', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5, status: 'confirmed' },
  { id: '3', amount: 100.0, txHash: '9vX4...3kRt', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10, status: 'confirmed' },
];

export default function StakeHistory() {
  // In a real app, this would fetch from an indexer or chain history
  const [history, setHistory] = useState<StakeEvent[]>([]);

  useEffect(() => {
    setHistory(MOCK_STAKE_HISTORY);
  }, []);

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <h3 className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider mb-4">
        Recent Staking Activity
      </h3>
      
      <div className="bg-[#151b28] rounded-md border border-slate-800 overflow-hidden">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-sm">
            No staking history found
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {history.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-slate-200 font-mono font-bold text-sm">Staked {item.amount.toFixed(2)} SOL</div>
                    <div className="text-xs text-slate-500 font-mono">{new Date(item.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-xs font-mono text-green-500 uppercase">{item.status}</span>
                  </div>
                  <a 
                    href={`https://explorer.solana.com/tx/${item.txHash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-slate-600 hover:text-blue-400 font-mono underline mt-1 block"
                  >
                    View TX
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

