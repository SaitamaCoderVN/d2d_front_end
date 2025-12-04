'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { unstakeSolAnchor } from '@/lib/d2dProgramAnchor';
import { fetchBackerDataOnChain, OnChainBackerData } from '@/lib/backerOnChain';
import UnstakeHistory from '@/components/UnstakeHistory';

export default function UnstakePage() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onChainData, setOnChainData] = useState<OnChainBackerData | null>(null);
  
  const isFetchingRef = useRef(false);
  
  const refreshOnChainData = useCallback(async () => {
    if (!publicKey || !connected) {
      setIsLoading(false);
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      
      const data = await fetchBackerDataOnChain(connection, wallet);
      setOnChainData(data);
    } catch (error) {
      console.error('Error fetching on-chain data:', error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [publicKey, connected, connection, wallet]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshOnChainData();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [publicKey, connected, refreshOnChainData]);

  const userStake = onChainData?.userStake ?? 0;
  // Lock period is not really enforced in frontend for unstake in the same way, 
  // but the contract might enforce it. We assume if they can stake they can try to unstake 
  // and contract will fail if locked.
  // But standard `unstake_sol` might check lock period.

  const handleUnstake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(unstakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > userStake) {
      toast.error(`Insufficient staked balance. You have ${userStake.toFixed(4)} SOL.`);
      return;
    }

    setIsUnstaking(true);

    try {
      toast.loading('Preparing unstake transaction...', { id: 'unstake' });

      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

      // Use Anchor client
      toast.loading('Please approve unstake transaction...', { id: 'unstake' });
      
      const signature = await unstakeSolAnchor(connection, wallet, amountLamports);

      toast.loading('Confirming transaction...', { id: 'unstake' });
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(`✅ Successfully unstaked ${amount} SOL!`, { id: 'unstake', duration: 5000 });

      setUnstakeAmount('');
      
      await refreshOnChainData();

      setTimeout(() => {
        toast.success(
          <div>
            <div className="font-semibold mb-1">Transaction Confirmed!</div>
            <a
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0066FF] hover:underline text-sm"
            >
              View on Explorer ↗
            </a>
          </div>,
          { duration: 10000 }
        );
      }, 1000);
    } catch (error: any) {
      console.error('Unstaking error:', error);
      
      // Handle specific errors if possible
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled', { id: 'unstake' });
      } else if (error.message?.includes('StakeLocked') || error.message?.includes('0x177b')) { // 6011 = 0x177b
        toast.error('Stake is still locked.', { id: 'unstake' });
      } else {
        toast.error(`Error: ${error.message || 'Failed to unstake'}`, { id: 'unstake' });
      }
    } finally {
      setIsUnstaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <main className="container-main py-8">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-200 font-mono flex items-center gap-3">
              <span className="text-blue-500">&gt;</span> UN STAKE
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">Withdraw your staked SOL</p>
          </div>
        </div>

        {!connected ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-md border border-slate-800 border-dashed">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2 font-mono">WALLET_DISCONNECTED</h2>
            <p className="text-slate-500 mb-8 font-mono text-sm">Please connect your wallet to manage your stake.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 bg-[#151b28] border-slate-800 relative">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-200 font-mono mb-2">WITHDRAW_LIQUIDITY</h2>
                  <p className="text-sm text-slate-400 font-mono">
                    Unstake your SOL from the treasury pool.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-mono mb-1">Staked Balance</div>
                  <div className="text-sm text-blue-400 font-mono font-bold">
                    {userStake.toFixed(4)} SOL
                  </div>
                </div>
              </div>

              <form onSubmit={handleUnstake} className="space-y-6">
                <div className="bg-black/20 p-6 rounded-lg border border-slate-800/50">
                  <label htmlFor="amount" className="text-label block mb-3 text-xs font-mono text-blue-500">
                    ENTER_AMOUNT
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="amount"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={userStake}
                      className="w-full bg-transparent text-3xl font-mono text-white placeholder-slate-700 focus:outline-none"
                      disabled={isUnstaking}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <span className="text-sm font-mono text-slate-500">SOL</span>
                      <button
                        type="button"
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 font-mono px-3 py-1.5 rounded border border-slate-700 transition-colors"
                        onClick={() => setUnstakeAmount(userStake.toString())}
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUnstaking || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono rounded transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUnstaking ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      PROCESSING...
                    </>
                  ) : (
                    <>
                      <span>CONFIRM_UNSTAKE</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Unstake History Component */}
            <UnstakeHistory />
          </div>
        )}
      </main>
    </div>
  );
}
