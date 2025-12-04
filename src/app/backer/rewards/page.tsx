'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { claimRewardsAnchor } from '@/lib/d2dProgramAnchor';
import { fetchBackerDataOnChain, OnChainBackerData } from '@/lib/backerOnChain';
import { checkStakeAccountExists } from '@/lib/d2dProgram';
import { debugClaimRewards } from '@/lib/debugUtils';
import ClaimHistory from '@/components/ClaimHistory';

export default function RewardsPage() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  
  const [isClaiming, setIsClaiming] = useState(false);
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

  const userRewards = onChainData?.userRewards ?? 0;

  const handleClaimRewards = async () => {
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!onChainData || userRewards <= 0) {
      toast.error('No rewards to claim.');
      return;
    }
    
    // Check if inactive is handled gracefully
    if (!onChainData.isActive) {
       toast.error('Your stake is inactive.');
       return;
    }

    setIsClaiming(true);

    try {
      toast.loading('Checking stake account...', { id: 'claim' });

      const accountExists = await checkStakeAccountExists(connection, publicKey);
      if (!accountExists) {
        toast.error('Stake account not found.', { id: 'claim' });
        setIsClaiming(false);
        return;
      }

      toast.loading('Claiming rewards...', { id: 'claim' });

      const signature = await claimRewardsAnchor(connection, wallet);

      toast.loading('Confirming transaction...', { id: 'claim' });
      await connection.confirmTransaction(signature, 'confirmed');

      const claimedAmount = userRewards;

      await refreshOnChainData();

      toast.success(`✅ Claimed ${claimedAmount.toFixed(4)} SOL!`, { id: 'claim', duration: 5000 });

      setTimeout(() => {
        toast.success(
          <div>
            <div className="font-semibold mb-1">Rewards Claimed!</div>
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
      console.error('Claim error:', error);
      
      let errorMessage = 'Failed to claim rewards';
      
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message?.includes('NoRewardsToClaim')) {
        errorMessage = 'No rewards available to claim yet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { id: 'claim', duration: 5000 });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleDebug = async () => {
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }
    await debugClaimRewards(connection, publicKey);
    toast.success('Debug info logged to console (F12)');
  };

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <main className="container-main py-8">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-200 font-mono flex items-center gap-3">
              <span className="text-blue-500">&gt;</span> REWARDS
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">Claim your accumulated rewards</p>
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
            <p className="text-slate-500 mb-8 font-mono text-sm">Please connect your wallet to check rewards.</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className={`bg-[#151b28] p-6 rounded-md border ${userRewards > 0 ? 'border-blue-500/50' : 'border-slate-800'} flex flex-col`}>
              <div className="mb-auto">
                <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider mb-4">
                  Rewards Status
                </h3>
                
                {userRewards > 0 ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400 border border-blue-500/20 animate-pulse">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-white font-mono mb-1">
                      {userRewards.toFixed(4)}
                    </div>
                    <div className="text-xs text-blue-400 font-mono uppercase mb-6">
                      SOL Available
                    </div>
                    
                    <button
                      onClick={handleClaimRewards}
                      disabled={isClaiming}
                      className="w-full py-3 bg-slate-800 hover:bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:border-blue-500 rounded font-mono font-bold transition-all text-sm"
                    >
                      {isClaiming ? 'CLAIMING...' : 'CLAIM REWARDS'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </div>
                    <p className="font-mono text-xs">No rewards yet</p>
                    <p className="text-[10px] text-slate-600 mt-2 font-mono">Stake SOL to start earning</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-slate-500 font-mono">DEBUG TOOLS</span>
                  <button
                    onClick={handleDebug}
                    className="text-[10px] text-slate-400 hover:text-white underline font-mono"
                  >
                    Print Logs
                  </button>
                </div>
              </div>
            </div>
            
            {/* Claim History Component */}
            <ClaimHistory />
          </div>
        )}
      </main>
    </div>
  );
}
