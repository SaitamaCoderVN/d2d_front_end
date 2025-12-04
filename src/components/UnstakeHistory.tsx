'use client';

import { useState, useEffect } from 'react';

interface UnstakeEvent {
  id: string;
  amount: number;
  txHash: string;
  timestamp: number;
  status: 'confirmed' | 'pending';
}

const MOCK_UNSTAKE_HISTORY: UnstakeEvent[] = [
  { id: '1', amount: 25.0, txHash: '7jK9...2mSq', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1, status: 'confirmed' },
  { id: '2', amount: 5.0, txHash: '3xP2...8nLr', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 15, status: 'confirmed' },
];

export default function UnstakeHistory() {
  const [history, setHistory] = useState<UnstakeEvent[]>([]);

  useEffect(() => {
    setHistory(MOCK_UNSTAKE_HISTORY);
  }, []);

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <h3 className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider mb-4">
        Recent Unstaking Activity
      </h3>
      
      <div className="bg-[#151b28] rounded-md border border-slate-800 overflow-hidden">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-sm">
            No unstaking history found
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {history.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-slate-200 font-mono font-bold text-sm">Unstaked {item.amount.toFixed(2)} SOL</div>
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

