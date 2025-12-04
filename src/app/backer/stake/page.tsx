'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { stakeSolAnchor } from '@/lib/d2dProgramAnchor';
import { fetchBackerDataOnChain, OnChainBackerData } from '@/lib/backerOnChain';
import { poolApi, UtilizationData } from '@/lib/api';
import StakeHistory from '@/components/StakeHistory';

export default function StakePage() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onChainData, setOnChainData] = useState<OnChainBackerData | null>(null);
  const [utilizationData, setUtilizationData] = useState<UtilizationData | null>(null);
  
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

  const currentApy = utilizationData?.projectedApy ?? (onChainData?.currentApy ?? 0);

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 0.1) {
      toast.error('Minimum stake amount is 0.1 SOL');
      return;
    }

    setIsStaking(true);

    try {
      toast.loading('Preparing stake transaction...', { id: 'stake' });

      // Check wallet balance before staking
      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      
      // Estimate required balance: deposit + rent exemption (~1.4M) + transaction fee (~10k)
      const RENT_EXEMPTION_ESTIMATE = 1_400_000; // ~1.4M lamports for new account
      const TRANSACTION_FEE_ESTIMATE = 10_000;
      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const estimatedRequired = amountLamports + RENT_EXEMPTION_ESTIMATE + TRANSACTION_FEE_ESTIMATE;
      
      if (balance < estimatedRequired) {
        const needed = (estimatedRequired - balance) / LAMPORTS_PER_SOL;
        toast.error(`Insufficient balance. Need ${(estimatedRequired / LAMPORTS_PER_SOL).toFixed(4)} SOL, have ${balanceSOL.toFixed(4)} SOL.`, { id: 'stake' });
        return;
      }

      // Use Anchor client for better error handling
      toast.loading('Please approve stake transaction...', { id: 'stake' });
      let signature: string;
      try {
        signature = await stakeSolAnchor(connection, wallet, amountLamports, 0);
      } catch (stakeError: any) {
        console.error('Staking error:', stakeError);
        
        // Handle AccountDiscriminatorMismatch - account exists but with old format
        if (
          stakeError?.message?.includes('AccountDiscriminatorMismatch') ||
          stakeError?.code === 3002 ||
          stakeError?.errorCode === 3002
        ) {
          toast.error(
            'Account exists with old format. Please contact admin to migrate your account.',
            { id: 'stake', duration: 10000 }
          );
          throw new Error(
            'AccountDiscriminatorMismatch: Your stake account exists but has an old format.'
          );
        }
        
        throw stakeError;
      }

      toast.loading('Confirming transaction...', { id: 'stake' });
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(`✅ Successfully staked ${amount} SOL!`, { id: 'stake', duration: 5000 });

      setStakeAmount('');
      
      // Refresh on-chain data
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
      console.error('Staking error:', error);
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled', { id: 'stake' });
      } else {
        toast.error(`Error: ${error.message || 'Failed to stake'}`, { id: 'stake' });
      }
    } finally {
      setIsStaking(false);
    }
  };

  const calculateEstimatedRewards = () => {
    if (!stakeAmount || isNaN(parseFloat(stakeAmount))) return 0;
    return (parseFloat(stakeAmount) * currentApy) / 100;
  };

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <main className="container-main py-8">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-200 font-mono flex items-center gap-3">
              <span className="text-blue-500">&gt;</span> STAKE
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">Add liquidity to earn rewards</p>
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
            <p className="text-slate-500 mb-8 font-mono text-sm">Please connect your wallet to stake SOL.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 bg-[#151b28] border-slate-800 relative">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-200 font-mono mb-2">ADD_LIQUIDITY</h2>
                  <p className="text-sm text-slate-400 font-mono">
                    Stake SOL to earn rewards from deployment fees.
                  </p>
                </div>
              </div>

              <form onSubmit={handleStake} className="space-y-6">
                <div className="bg-black/20 p-6 rounded-lg border border-slate-800/50">
                  <label htmlFor="amount" className="text-label block mb-3 text-xs font-mono text-blue-500">
                    ENTER_AMOUNT
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="amount"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.1"
                      className="w-full bg-transparent text-3xl font-mono text-white placeholder-slate-700 focus:outline-none"
                      disabled={isStaking}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      <span className="text-sm font-mono text-slate-500">SOL</span>
                      <button
                        type="button"
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 font-mono px-3 py-1.5 rounded border border-slate-700 transition-colors"
                        onClick={() => setStakeAmount('1')}
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                </div>

                {stakeAmount && !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) >= 0.1 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded p-3 border border-slate-800/50 text-center">
                      <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">Est. Monthly Rewards</div>
                      <div className="text-blue-400 font-mono font-bold">
                        {(calculateEstimatedRewards() / 12).toFixed(4)} SOL
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded p-3 border border-slate-800/50 text-center">
                      <div className="text-[10px] text-slate-500 font-mono uppercase mb-1">Est. Annual Rewards</div>
                      <div className="text-blue-400 font-mono font-bold">
                        {calculateEstimatedRewards().toFixed(4)} SOL
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < 0.1}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-black font-bold font-mono rounded transition-all shadow-[0_0_20px_rgba(59, 130, 246,0.2)] hover:shadow-[0_0_30px_rgba(59, 130, 246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isStaking ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      PROCESSING_TRANSACTION...
                    </>
                  ) : (
                    <>
                      <span>CONFIRM_STAKE</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Stake History Component */}
            <StakeHistory />
          </div>
        )}
      </main>
    </div>
  );
}
