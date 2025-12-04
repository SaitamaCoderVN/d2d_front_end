'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { fetchBackerDataOnChain, OnChainBackerData } from '@/lib/backerOnChain';
import { debugClaimRewards } from '@/lib/debugUtils';
import { poolApi, UtilizationData } from '@/lib/api';
import UtilizationChart from '@/components/UtilizationChart';
import PoolNewsTicker from '@/components/PoolNewsTicker';

export default function BackerPage() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  
  const [isLoading, setIsLoading] = useState(true);
  const [onChainData, setOnChainData] = useState<OnChainBackerData | null>(null);
  const [utilizationData, setUtilizationData] = useState<UtilizationData | null>(null);
  
  // Constants
  const SOL_PRICE = 200;
  
  // Ref to track if we're currently fetching to prevent duplicate calls
  const isFetchingRef = useRef(false);
  
  // Fetch data from on-chain with debounce and duplicate prevention
  const refreshOnChainData = useCallback(async () => {
    if (!publicKey || !connected) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      
      // Fetch both on-chain data and utilization data
      const [data, utilData] = await Promise.all([
        fetchBackerDataOnChain(connection, wallet),
        poolApi.getUtilization().catch(err => {
          console.error('Failed to fetch utilization:', err);
          return null;
        })
      ]);
      
      setOnChainData(data);
      setUtilizationData(utilData);
    } catch (error) {
      console.error('Error fetching on-chain data:', error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [publicKey, connected, connection, wallet]);

  // Load from on-chain on mount and when wallet changes (with debounce)
  useEffect(() => {
    // Debounce: wait 300ms before fetching to avoid rapid re-renders
    const timeoutId = setTimeout(() => {
      refreshOnChainData();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [publicKey, connected, refreshOnChainData]);

  // Extract values from on-chain data
  const userStake = onChainData?.userStake ?? 0;
  // const totalStaked = onChainData?.totalStaked ?? 0; // Unused
  const totalDeposited = onChainData?.totalDeposited ?? 0;
  const liquidBalance = onChainData?.liquidBalance ?? 0;
  const lockedBalance = onChainData?.lockedBalance ?? 0;
  const userRewards = onChainData?.userRewards ?? 0;
  // const daysStaked = onChainData?.daysStaked ?? 0; // Unused
  // Use projected APY from backend if available, otherwise fallback to on-chain or default
  const currentApy = utilizationData?.projectedApy ?? (onChainData?.currentApy ?? 0);
  const availableRewards = onChainData?.availableRewards ?? 0;
  const deploymentsSupported = onChainData?.deploymentsSupported ?? 0;

  const handleDebug = async () => {
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }
    await debugClaimRewards(connection, publicKey);
    toast.success('Debug info logged to console (F12)');
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] pb-12">
      {/* Header Removed - Handled by Sidebar */}
      
      <main className="container-main py-8">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-200 font-mono flex items-center gap-3">
              <span className="text-blue-500">&gt;</span> LIQUIDITY_POOL
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">Pool statistics & performance</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-xs font-mono text-blue-400">POOL ACTIVE</span>
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
            <p className="text-slate-500 mb-8 font-mono text-sm">Please connect your wallet in the header to access the staking pool.</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 1. HERO SECTION: Chart & Key Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart - Takes up 2 columns */}
              <div className="lg:col-span-2 bg-[#151b28] p-6 rounded-md border border-slate-800 relative overflow-hidden group">
                <div className="mb-4 flex items-center justify-between relative z-10">
                  <div>
                    <h2 className="text-lg font-bold text-slate-200 font-mono flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      POOL_UTILIZATION
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Real-time SOL deployment frequency (30 days)
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 font-mono text-xs">
                    LIVE
                  </div>
                </div>
                <div className="relative z-10">
                  <UtilizationChart data={utilizationData?.history || []} isLoading={isLoading} />
                </div>
                {/* Background glow effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            </div>

              {/* Key Metrics - Takes up 1 column */}
              <div className="lg:col-span-1 space-y-6">
                {/* APY Card */}
                <div className="bg-gradient-to-br from-[#1a1f2e] to-[#151b28] p-6 rounded-md border border-blue-500/30 relative overflow-hidden shadow-lg shadow-blue-900/10">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-24 h-24 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                  <div className="relative z-10">
                    <div className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-2">Projected APY</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white font-mono">
                        {utilizationData ? utilizationData.projectedApy.toFixed(2) : '0.00'}%
                      </span>
                      <span className="text-xs text-blue-500 font-mono bg-blue-500/10 px-1.5 py-0.5 rounded">+1.2% this week</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-3 leading-relaxed">
                      Dynamic rate based on {utilizationData ? (utilizationData.currentUtilizationRate * 100).toFixed(1) : '0.0'}% pool utilization. Higher usage = higher returns.
                    </p>
                  </div>
                      </div>

                {/* Utilization Rate & Total Pool Split */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-[#151b28] p-5 rounded-md border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">Current Utilization</div>
                    <div className="text-2xl font-bold text-blue-400 font-mono">
                      {utilizationData ? `${(utilizationData.currentUtilizationRate * 100).toFixed(2)}%` : '0.00%'}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${utilizationData ? utilizationData.currentUtilizationRate * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="bg-[#151b28] p-5 rounded-md border border-slate-800">
                    <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">Total Pool Liquidity</div>
                    <div className="text-2xl font-bold text-purple-400 font-mono">
                      {isLoading ? '...' : `${totalDeposited.toFixed(2)} SOL`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      {isLoading ? '...' : `${liquidBalance.toFixed(2)} SOL`} available
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SECONDARY STATS GRID (User specific) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Your Stake', value: `${userStake.toFixed(2)} SOL`, sub: `≈ $${(userStake * SOL_PRICE).toFixed(2)}`, color: 'text-white' },
                { label: 'Rewards Earned', value: `${userRewards.toFixed(4)} SOL`, sub: userRewards > 0 ? 'Ready to claim' : 'Stake to earn', color: 'text-blue-400' },
                { label: 'Deployments Funded', value: deploymentsSupported.toString(), sub: 'Global protocol usage', color: 'text-slate-300' },
                { label: 'Locked Liquidity', value: `${lockedBalance.toFixed(2)} SOL`, sub: 'Active in deployments', color: 'text-orange-400' }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#151b28]/50 p-4 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">{item.label}</div>
                  <div className={`text-lg font-bold font-mono ${item.color}`}>{isLoading ? '...' : item.value}</div>
                  <div className="text-[10px] text-slate-600 font-mono mt-1">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      {/* Pool News Ticker - Fixed at bottom */}
      <PoolNewsTicker />
    </div>
  );
}
