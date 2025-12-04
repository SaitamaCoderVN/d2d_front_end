'use client';

import { useState, useEffect } from 'react';

interface ClaimEvent {
  id: string;
  amount: number;
  txHash: string;
  timestamp: number;
  status: 'confirmed' | 'pending';
}

const MOCK_CLAIM_HISTORY: ClaimEvent[] = [
  { id: '1', amount: 1.25, txHash: '4hL8...9kPq', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3, status: 'confirmed' },
  { id: '2', amount: 0.85, txHash: '2xM1...7nQr', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 10, status: 'confirmed' },
  { id: '3', amount: 2.10, txHash: '9vY5...3kSt', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 20, status: 'confirmed' },
];

export default function ClaimHistory() {
  const [history, setHistory] = useState<ClaimEvent[]>([]);

  useEffect(() => {
    setHistory(MOCK_CLAIM_HISTORY);
  }, []);

  return (
    <div className="mt-8 max-w-md mx-auto">
      <h3 className="text-sm font-bold text-slate-400 font-mono uppercase tracking-wider mb-4">
        Recent Claims
      </h3>
      
      <div className="bg-[#151b28] rounded-md border border-slate-800 overflow-hidden">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-sm">
            No claim history found
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {history.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-slate-200 font-mono font-bold text-sm">Claimed {item.amount.toFixed(4)} SOL</div>
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

