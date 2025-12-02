'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BorshAccountsCoder, Idl } from '@coral-xyz/anchor';
import { deploymentApi, configApi, poolApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Connection,
} from '@solana/web3.js';
import { CostBreakdown, AppConfig } from '@/types';
import idl from '@/idl/d2d_program_sol.json';
import type { D2dProgramSol } from '@/types/d2d_program_sol';
import { getTreasuryPoolPda, getRewardPoolPda, getPlatformPoolPda, D2D_PROGRAM_ID } from '@/lib/d2dProgram';

interface DeploymentFormProps {
  onDeploymentCreated: () => void;
}

enum DeploymentPhase {
  INPUT = 'input',
  VERIFYING = 'verifying',
  CALCULATING = 'calculating',
  READY = 'ready',
  PAYMENT = 'payment',
  EXECUTING = 'executing',
  COMPLETE = 'complete',
}

// Force Devnet RPC
const DEVNET_RPC = 'https://api.devnet.solana.com';

export default function DeploymentForm({ onDeploymentCreated }: DeploymentFormProps) {
  const { publicKey, sendTransaction, wallet } = useWallet();
  
  // Force Devnet connection
  const [devnetConnection] = useState(() => new Connection(DEVNET_RPC, 'confirmed'));
  const connection = devnetConnection; // Always use Devnet

  const programIdl = useMemo(() => idl as unknown as D2dProgramSol, []);
  const programIdFromIdl = useMemo(() => new PublicKey(programIdl.address), [programIdl]);
  const accountsCoder = useMemo(() => new BorshAccountsCoder(idl as unknown as Idl), []);

  // Derive treasury pool PDA (no hardcoding)
  const treasuryPoolAddress = useMemo(() => getTreasuryPoolPda().toString(), []);

  useEffect(() => {
    if (!programIdFromIdl.equals(D2D_PROGRAM_ID)) {
      console.warn('⚠️  IDL address mismatch detected', {
        idlAddress: programIdFromIdl.toString(),
        constantAddress: D2D_PROGRAM_ID.toString(),
      });
    }
  }, [programIdFromIdl]);

  const fetchTreasuryPoolSnapshot = useCallback(async () => {
    try {
      const treasuryPool = getTreasuryPoolPda();
      const accountInfo = await connection.getAccountInfo(treasuryPool);

      if (!accountInfo) {
        console.warn('Treasury pool account not found on current cluster');
        return null;
      }

      const decoded = accountsCoder.decode('treasuryPool', accountInfo.data);
      return { publicKey: treasuryPool, data: decoded };
    } catch (snapshotError) {
      console.warn('Failed to fetch treasury pool snapshot', snapshotError);
      return null;
    }
  }, [connection, accountsCoder]);
  
  // Form state
  const [devnetProgramId, setDevnetProgramId] = useState('');
  const [phase, setPhase] = useState<DeploymentPhase>(DeploymentPhase.INPUT);
  
  // Config state
  const [config, setConfig] = useState<AppConfig | null>(null);
  
  // Cost breakdown state
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  
  // Treasury pool state
  const [availableForDeploy, setAvailableForDeploy] = useState<number | null>(null);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Network warning state
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);
  
  // Simulation mode state
  const [isSimulationMode, setIsSimulationMode] = useState(false);

  // Fetch config and pool state on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log('📋 Fetching treasury config...');
        const treasuryConfig = await configApi.getTreasuryConfig();
        setConfig(treasuryConfig);
        console.log('✅ Config loaded:', treasuryConfig);
      } catch (error: any) {
        console.error('❌ Failed to fetch config:', error);
        // Don't block the UI, but log the error
        // Config is used with optional chaining in most places
      }
    };
    
    const fetchPoolState = async () => {
      try {
        setIsLoadingPool(true);
        console.log('📊 Fetching treasury pool state...');
        const poolState = await poolApi.getPoolState();
        setAvailableForDeploy(poolState.availableForDeploySOL);
        console.log('✅ Pool state loaded:', {
          availableForDeploy: poolState.availableForDeploySOL,
          treasuryPoolPDA: poolState.treasuryPoolPDA,
        });
      } catch (error: any) {
        console.error('❌ Failed to fetch pool state:', error);
        // Don't block the UI, but log the error
      } finally {
        setIsLoadingPool(false);
      }
    };
    
    fetchConfig();
    fetchPoolState();
    
    // Refresh pool state every 30 seconds
    const interval = setInterval(fetchPoolState, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check wallet network
  useEffect(() => {
    const checkWalletNetwork = async () => {
      if (!publicKey) return;
      
      try {
        console.log('🔗 Checking wallet connection...');
        console.log('   Wallet:', wallet?.adapter.name);
        console.log('   Public Key:', publicKey.toString());
        
        // Check balance to verify connection
        const balance = await connection.getBalance(publicKey);
        console.log(`   Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL (Devnet)`);
        
        // Verify we're on Devnet by checking genesis hash
        const genesisHash = await connection.getGenesisHash();
        console.log('   Genesis Hash:', genesisHash);
        
        // Devnet genesis hash: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
        const isDevnet = genesisHash === 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
        
        if (!isDevnet) {
          const warning = '⚠️  Your wallet might not be on Devnet. Please switch to Devnet in your wallet settings.';
          console.warn(warning);
          setNetworkWarning(warning);
        } else {
          console.log('✅ Wallet is connected to Devnet');
          setNetworkWarning(null);
        }
      } catch (error: any) {
        console.error('❌ Failed to check wallet network:', error);
        // Don't show error toast, might be temporary connection issue
      }
    };
    
    checkWalletNetwork();
  }, [publicKey, wallet, connection]);

  const resetForm = () => {
    setDevnetProgramId('');
    setPhase(DeploymentPhase.INPUT);
    setCostBreakdown(null);
    setError(null);
    setIsSimulationMode(false);
  };

  /**
   * Check wallet balance and verify sufficient funds for payment
   */
  const ensureSufficientBalance = async (paymentAmountLamports?: number): Promise<boolean> => {
    if (!publicKey) return false;
    
    try {
      console.log('💰 Checking wallet balance...');
      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      console.log(`   Current balance: ${balanceSOL.toFixed(4)} SOL (${balance} lamports)`);
      
      if (paymentAmountLamports) {
        // Calculate total required: payment + transaction fees (estimate ~10k lamports per instruction)
        const TRANSACTION_FEE_ESTIMATE = 20_000; // ~20k for 2 transfers
        const totalRequired = paymentAmountLamports + TRANSACTION_FEE_ESTIMATE;
        const totalRequiredSOL = totalRequired / LAMPORTS_PER_SOL;
        
        console.log(`   Payment amount: ${(paymentAmountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
        console.log(`   Transaction fee estimate: ${(TRANSACTION_FEE_ESTIMATE / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
        console.log(`   Total required: ${totalRequiredSOL.toFixed(4)} SOL`);
        
        if (balance < totalRequired) {
          const missing = (totalRequired - balance) / LAMPORTS_PER_SOL;
          console.error(`   ❌ Insufficient balance! Missing: ${missing.toFixed(4)} SOL`);
          toast.error(
            `Insufficient SOL. Need ${totalRequiredSOL.toFixed(4)} SOL, have ${balanceSOL.toFixed(4)} SOL. Missing: ${missing.toFixed(4)} SOL`,
            { duration: 10000 }
          );
          return false;
        }
        
        console.log(`   ✅ Sufficient balance for payment`);
      } else {
        // Just check minimum balance
        const requiredBalance = 0.5 * LAMPORTS_PER_SOL;
        if (balance < requiredBalance) {
          console.error(`   ❌ Balance too low. Need at least 0.5 SOL`);
          return false;
        }
      console.log('✅ Sufficient balance for deployment');
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to check balance:', error);
      return false;
    }
  };

  // Phase 1: Verify Program
  const handleVerifyProgram = async () => {
    if (!devnetProgramId.trim()) {
      toast.error('Please enter a program ID');
      return;
    }

    // Validate program ID format
    try {
      new PublicKey(devnetProgramId.trim());
    } catch (error) {
      toast.error('Invalid program ID format');
      setError('Invalid program ID format');
      return;
    }

    setPhase(DeploymentPhase.VERIFYING);
    setError(null);
    
    const toastId = toast.loading('Verifying program on devnet...');

    try {
      const verifyResult = await deploymentApi.verifyProgram({
        programId: devnetProgramId.trim(),
      });

      if (!verifyResult.isValid) {
        toast.error(verifyResult.error || 'Program not found on devnet', { id: toastId });
        setError(verifyResult.error || 'Program not found on devnet');
        setPhase(DeploymentPhase.INPUT);
        return;
      }

      toast.success('✅ Program verified on devnet!', { id: toastId });
      
      // Automatically move to Phase 2: Calculate costs
      handleCalculateCosts(toastId);
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to verify program';
      toast.error(`Verification failed: ${errorMessage}`, { id: toastId });
      setError(errorMessage);
      setPhase(DeploymentPhase.INPUT);
    }
  };

  // Phase 2: Calculate Costs
  const handleCalculateCosts = async (existingToastId?: string) => {
    setPhase(DeploymentPhase.CALCULATING);
    
    const toastId = existingToastId || toast.loading('Calculating deployment costs...');

    try {
      const costs = await deploymentApi.calculateCost({
        programId: devnetProgramId.trim(),
      });

      setCostBreakdown(costs);
      toast.success('💰 Cost calculated successfully!', { id: toastId });
      setPhase(DeploymentPhase.READY);
    } catch (error: any) {
      console.error('Cost calculation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to calculate costs';
      toast.error(`Cost calculation failed: ${errorMessage}`, { id: toastId });
      setError(errorMessage);
      setPhase(DeploymentPhase.INPUT);
    }
  };

  // Phase 3: Send Payment and Execute Deployment
  const handleDeployment = async () => {
    if (!publicKey || !costBreakdown) {
      toast.error('❌ Missing required data. Please try again.');
      return;
    }

    // Config is optional (used for display only), but log if missing
    if (!config) {
      console.warn('⚠️  Config not loaded, proceeding with defaults');
    }

    console.log('🚀 Starting deployment flow...');
    console.log('   User wallet:', publicKey.toString());
    console.log('   Program ID:', devnetProgramId.trim());
    console.log('   Total cost:', costBreakdown.totalPaymentSOL.toFixed(4), 'SOL');

    setPhase(DeploymentPhase.PAYMENT);
    setIsSimulationMode(false);

    try {
      // Calculate fee breakdown first
      const monthlyFeeAmount = costBreakdown.monthlyFee * costBreakdown.initialMonths;
      const platformFeeAmount = costBreakdown.deploymentPlatformFee;
      const rewardFeeAmount = monthlyFeeAmount;
      const remainingPayment = costBreakdown.serviceFee;
      const totalRewardPoolPayment = rewardFeeAmount + remainingPayment;
      const totalPaymentLamports = totalRewardPoolPayment + platformFeeAmount;

      // Step 0: Ensure sufficient balance for payment
      console.log('📋 Step 0: Checking balance...');
      const hasBalance = await ensureSufficientBalance(totalPaymentLamports);
      if (!hasBalance) {
        throw new Error('Insufficient SOL for payment. Please get more SOL from a faucet.');
      }

      // Step 1: Create and send payment transaction
      console.log('📋 Step 1: Creating payment transaction...');
      toast.loading('Creating payment transaction...', { id: 'payment' });
      
      const rewardPoolAddress = getRewardPoolPda();
      const platformPoolAddress = getPlatformPoolPda();

      console.log('   Payment breakdown:');
      console.log('   - Reward Pool (monthly fee + service fee):', (totalRewardPoolPayment / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
      console.log('   - Platform Pool (platform fee):', (platformFeeAmount / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
      console.log('   - Total:', (costBreakdown.totalPayment / LAMPORTS_PER_SOL).toFixed(4), 'SOL');

      const treasurySnapshot = await fetchTreasuryPoolSnapshot();
      if (treasurySnapshot) {
        const { data } = treasurySnapshot as { data: Record<string, any> };
        console.log('   Treasury pool (pre-payment) state:', {
          totalStaked: data.totalStaked?.toString?.() ?? data.totalStaked,
          totalFeesCollected: data.totalFeesCollected?.toString?.() ?? data.totalFeesCollected,
          currentApy: data.currentApy?.toString?.() ?? data.currentApy,
        });
      }

      // Create transaction with 2 transfers:
      // 1. Reward Pool: monthlyFee + serviceFee
      // 2. Platform Pool: platformFee
      const transaction = new Transaction()
        .add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: rewardPoolAddress, // Monthly fee (1%) + service fee → RewardPool
            lamports: totalRewardPoolPayment,
          })
        )
        .add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: platformPoolAddress, // Platform fee (0.1%) → PlatformPool
            lamports: platformFeeAmount,
          })
        );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('   Blockhash:', blockhash);
      console.log('   Last valid height:', lastValidBlockHeight);

      // Pre-flight: Simulate transaction before sending
      console.log('🔍 Pre-flight: Simulating transaction...');
      try {
        const simulationResult = await connection.simulateTransaction(transaction);
        console.log('📊 Simulation result:', simulationResult);
        
        if (simulationResult.value.err) {
          console.error('❌ Simulation failed:', simulationResult.value.err);
          console.error('   Logs:', simulationResult.value.logs);
          throw new Error(`Transaction will fail: ${JSON.stringify(simulationResult.value.err)}`);
        }
        
        console.log('✅ Simulation passed!');
        console.log('   Units consumed:', simulationResult.value.unitsConsumed);
        console.log('   Logs:', simulationResult.value.logs);
      } catch (simError: any) {
        console.error('❌ Pre-flight simulation error:', simError);
        toast.error('Transaction simulation failed. Please check your balance and try again.', { id: 'payment' });
        throw simError;
      }

      toast.loading('Please approve payment in your wallet...', { id: 'payment' });
      console.log('⏳ Waiting for wallet approval...');
      
      let signature: string | null = null;
      let isSimulated = false;

      try {
        // Validate transaction before sending
        console.log('🔍 Validating transaction...');
        console.log('   Fee Payer:', transaction.feePayer?.toString());
        console.log('   Recent Blockhash:', transaction.recentBlockhash);
        console.log('   Signatures:', transaction.signatures.length);
        console.log('   Instructions:', transaction.instructions.length);
        
        if (!transaction.feePayer) {
          throw new Error('Transaction fee payer not set');
        }
        if (!transaction.recentBlockhash) {
          throw new Error('Transaction blockhash not set');
        }

        // Send transaction with retry logic
        console.log('📤 Sending transaction to Solana RPC...');
        console.log('   RPC Endpoint:', connection.rpcEndpoint);
        
        let sendAttempts = 0;
        const maxAttempts = 3;
        
        while (sendAttempts < maxAttempts) {
          try {
            sendAttempts++;
            console.log(`   Attempt ${sendAttempts}/${maxAttempts}...`);
            
            signature = await sendTransaction(transaction, connection, {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
              maxRetries: 3,
            });
            
            console.log('✅ Transaction sent! Signature:', signature);
            break;
          } catch (sendError: any) {
            console.error(`❌ Send attempt ${sendAttempts} failed:`, sendError);
            
            if (sendAttempts >= maxAttempts) {
              throw sendError;
            }
            
            // Wait before retry
            console.log('   Retrying in 1 second...');
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        
        toast.loading('Confirming payment transaction...', { id: 'payment' });
        console.log('⏳ Waiting for confirmation...');
        if (!signature) {
          throw new Error('Payment signature was not generated');
        }

        console.log('   Signature:', signature);
        console.log('   Using strategy: blockhash + lastValidBlockHeight');
        
        // Confirm with timeout
        const confirmPromise = connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Confirmation timeout after 60s')), 60000)
        );
        
        await Promise.race([confirmPromise, timeoutPromise]);
        
        console.log('✅ Transaction confirmed!');
        
        toast.success(
          `✅ Payment confirmed! ${costBreakdown.totalPaymentSOL.toFixed(4)} SOL`,
          { id: 'payment', duration: 3000 }
        );

      } catch (walletError: any) {
        console.error('═══════════════════════════════════════════════');
        console.error('❌ Transaction Error Details');
        console.error('═══════════════════════════════════════════════');
        console.error('   Error Name:', walletError.name);
        console.error('   Error Message:', walletError.message);
        console.error('   Error Code:', walletError.code);
        if (walletError.logs) {
          console.error('   Program Logs:', walletError.logs);
        }
        console.error('   Stack:', walletError.stack);
        console.error('═══════════════════════════════════════════════');
        
        // Categorize error type
        let errorCategory = 'unknown';
        let shouldSimulate = false;
        
        // Check for user rejection
        if (
          walletError.name === 'WalletSendTransactionError' ||
          walletError.message?.includes('User rejected') ||
          walletError.message?.includes('rejected') ||
          walletError.message?.includes('declined') ||
          walletError.message?.includes('cancelled')
        ) {
          errorCategory = 'user_rejection';
          shouldSimulate = true;
          console.log('📝 Error category: User rejection');
        }
        // Check for RPC errors
        else if (
          walletError.message?.includes('RPC') ||
          walletError.message?.includes('Network') ||
          walletError.message?.includes('fetch') ||
          walletError.message?.includes('Connection') ||
          walletError.code === -32603 || // Internal error
          walletError.code === -32005 || // Node is unhealthy
          walletError.code === 429 // Rate limit
        ) {
          errorCategory = 'rpc_error';
          console.log('📝 Error category: RPC Error');
          console.error('   RPC Endpoint:', connection.rpcEndpoint);
          console.error('   Commitment:', connection.commitment);
        }
        // Check for insufficient funds
        else if (
          walletError.message?.includes('insufficient') ||
          walletError.message?.includes('balance') ||
          walletError.code === 1
        ) {
          errorCategory = 'insufficient_funds';
          console.log('📝 Error category: Insufficient funds');
        }
        // Check for blockhash not found
        else if (
          walletError.message?.includes('Blockhash not found') ||
          walletError.message?.includes('blockhash') ||
          walletError.code === -32002
        ) {
          errorCategory = 'blockhash_error';
          console.log('📝 Error category: Blockhash expired');
        }
        
        if (shouldSimulate || errorCategory === 'user_rejection') {
          console.log('⚠️  Wallet rejected transaction, switching to simulation mode...');
          
          toast.loading('Simulating transaction...', { id: 'payment' });
          
          try {
            // Simulate transaction
            const simulation = await connection.simulateTransaction(transaction);
            console.log('📊 Post-rejection simulation result:', simulation);
            
            if (simulation.value.err) {
              throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
            }
            
            console.log('✅ Simulation successful!');
            console.log('   Units consumed:', simulation.value.unitsConsumed);
            console.log('   Logs:', simulation.value.logs);
            
            // Use a mock signature for simulation
            signature = 'SIMULATED_' + Date.now() + '_' + Math.random().toString(36).substring(7);
            isSimulated = true;
            setIsSimulationMode(true);
            
            toast.success(
              `✅ Transaction simulated! Estimated cost: ${costBreakdown.totalPaymentSOL.toFixed(4)} SOL`,
              { id: 'payment', duration: 5000 }
            );
            
            console.log('📝 Mock signature:', signature);
            
          } catch (simError: any) {
            console.error('❌ Simulation also failed:', simError);
            throw new Error(`Both transaction and simulation failed: ${simError.message}`);
          }
        } else {
          // Provide specific error message based on category
          let userMessage = 'Transaction failed';
          
          switch (errorCategory) {
            case 'rpc_error':
              userMessage = 'Solana RPC error. The network might be congested. Please try again.';
              break;
            case 'insufficient_funds':
              userMessage = 'Insufficient SOL to complete transaction. Please request an airdrop.';
              break;
            case 'blockhash_error':
              userMessage = 'Transaction blockhash expired. Please try again.';
              break;
            default:
              userMessage = `Transaction failed: ${walletError.message}`;
          }
          
          throw new Error(userMessage);
        }
      }

      // Step 2: Execute deployment with payment proof (or simulation result)
      console.log('📋 Step 2: Executing deployment...');
      setPhase(DeploymentPhase.EXECUTING);
      toast.loading('Starting deployment process...', { id: 'deploy' });

      if (!signature) {
        throw new Error('Payment signature unavailable');
      }

      const deploymentResult = await deploymentApi.executeDeploy({
        userWalletAddress: publicKey.toString(),
        devnetProgramId: devnetProgramId.trim(),
        paymentSignature: signature,
        serviceFee: costBreakdown.serviceFee,
        deploymentPlatformFee: costBreakdown.deploymentPlatformFee,
        monthlyFee: costBreakdown.monthlyFee,
        initialMonths: costBreakdown.initialMonths,
        deploymentCost: costBreakdown.rentCost,
        programHash: costBreakdown.programHash,
      });
      
      console.log('✅ Deployment started:', deploymentResult);

      toast.success('🚀 Deployment started successfully!', { id: 'deploy', duration: 5000 });
      
      // Show transaction link
      setTimeout(() => {
        if (isSimulated) {
          toast.success(
            <div>
              <div className="font-semibold mb-1">🧪 Simulated Deployment</div>
              <div className="text-sm text-gray-600">
                Transaction was simulated. In production, real SOL would be transferred.
              </div>
            </div>,
            { duration: 10000 }
          );
        } else {
        toast.success(
          <div>
              <div className="font-semibold mb-1">Payment Transaction Confirmed!</div>
            <a 
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0066FF] hover:underline text-sm"
            >
              View on Solana Explorer (Devnet) ↗
            </a>
          </div>,
          { duration: 10000 }
        );
        }
      }, 1000);

      setPhase(DeploymentPhase.COMPLETE);
      
      // Wait a bit before resetting and refreshing
      setTimeout(() => {
        resetForm();
      onDeploymentCreated();
      }, 2000);

    } catch (error: any) {
      console.error('❌ Deployment error:', error);
      
      toast.dismiss('payment');
      toast.dismiss('deploy');
      
      // Better error categorization
      let errorMessage = 'Deployment failed';
      
      if (!publicKey) {
        errorMessage = 'Wallet not connected';
      } else if (error.message?.includes('Insufficient')) {
        errorMessage = 'Insufficient SOL on Devnet. Please get SOL from a faucet.';
      } else if (error.message?.includes('User rejected') || 
                 error.message?.includes('rejected') ||
                 error.message?.includes('declined') ||
                 error.message?.includes('cancelled')) {
        errorMessage = 'Transaction rejected by wallet';
        toast.error('❌ ' + errorMessage);
        setPhase(DeploymentPhase.READY);
        return;
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and ensure you\'re on Devnet.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('   Error type:', error.name);
      console.error('   Error message:', errorMessage);
      
      toast.error(`❌ ${errorMessage}`);
      setError(errorMessage);
      setPhase(DeploymentPhase.READY);
    }
  };

  const isLoading = phase === DeploymentPhase.VERIFYING || 
                    phase === DeploymentPhase.CALCULATING || 
                    phase === DeploymentPhase.PAYMENT || 
                    phase === DeploymentPhase.EXECUTING;

  const canStartVerification = phase === DeploymentPhase.INPUT && devnetProgramId.trim().length >= 32;
  const canDeploy = phase === DeploymentPhase.READY && costBreakdown && publicKey;

  return (
    <div className="card p-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-[#0066FF] rounded-lg flex items-center justify-center shadow-blue">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Deploy to Devnet</h2>
            <p className="text-gray-600">Enter your devnet program ID to begin</p>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="mt-6 flex items-center space-x-2 text-sm">
          <div className={`flex items-center space-x-1 ${phase >= DeploymentPhase.VERIFYING ? 'text-green-600' : 'text-gray-400'}`}>
            {phase > DeploymentPhase.VERIFYING ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-current" />
            )}
            <span>Verify</span>
          </div>
          <div className="flex-1 h-px bg-gray-300" />
          <div className={`flex items-center space-x-1 ${phase >= DeploymentPhase.CALCULATING ? 'text-green-600' : 'text-gray-400'}`}>
            {phase > DeploymentPhase.CALCULATING ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-current" />
            )}
            <span>Calculate</span>
          </div>
          <div className="flex-1 h-px bg-gray-300" />
          <div className={`flex items-center space-x-1 ${phase >= DeploymentPhase.PAYMENT ? 'text-green-600' : 'text-gray-400'}`}>
            {phase > DeploymentPhase.EXECUTING ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-current" />
            )}
            <span>Deploy</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Network Warning */}
        {networkWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Network Warning</p>
                <p className="text-sm text-yellow-700 mt-1">{networkWarning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Devnet Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">🧪 Devnet Testing Mode</p>
              <p className="text-sm text-blue-700 mt-1">
                All operations use Devnet SOL (no real money). 
                {config?.environment === 'devnet' 
                  ? ' ✅ Backend is in Devnet mode.' 
                  : ' ⚠️  Please ensure backend is in Devnet mode.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Treasury Pool Balance Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Treasury Pool</p>
                <p className="text-xs text-gray-500">Available for Deploy</p>
              </div>
            </div>
            <div className="text-right">
              {isLoadingPool ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-green-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-gray-500">Loading...</span>
                </div>
              ) : availableForDeploy !== null ? (
                <div>
                  <p className="text-2xl font-bold text-green-700">{availableForDeploy.toFixed(4)} SOL</p>
                  <p className="text-xs text-gray-500 mt-1">Pool: {treasuryPoolAddress}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Unable to load</p>
              )}
            </div>
          </div>
        </div>

        {/* Program ID Input */}
        <div>
          <label htmlFor="programId" className="block text-sm font-medium text-gray-700 mb-2">
            Devnet Program ID
          </label>
          <input
            type="text"
            id="programId"
            value={devnetProgramId}
            onChange={(e) => {
              setDevnetProgramId(e.target.value);
              setError(null);
            }}
            placeholder="e.g., TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            className="input-field font-mono text-sm"
            disabled={isLoading || phase === DeploymentPhase.COMPLETE}
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            The program must be deployed and verified on Solana Devnet
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Phase: Verifying */}
        {phase === DeploymentPhase.VERIFYING && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <svg className="animate-spin h-6 w-6 text-[#0066FF]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <div className="text-gray-900 font-semibold mb-1">Verifying Program</div>
                <div className="text-gray-600 text-sm">
                  Checking if program exists on devnet...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase: Calculating */}
        {phase === DeploymentPhase.CALCULATING && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <svg className="animate-spin h-6 w-6 text-[#0066FF]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <div className="text-gray-900 font-semibold mb-1">Calculating Costs</div>
                <div className="text-gray-600 text-sm">
                  Dumping program and calculating deployment costs...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase: Ready - Show Cost Breakdown */}
        {costBreakdown && phase === DeploymentPhase.READY && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900">Ready to Deploy</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Program Size</span>
                <span className="font-bold text-gray-900">{(costBreakdown.programSize / 1024).toFixed(2)} KB</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-t border-green-100">
                <span className="text-gray-700">Rent Exemption</span>
                <span className="font-bold text-gray-900">{(costBreakdown.rentCost / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-t border-green-100">
                <span className="text-gray-700">Service Fee ({config?.serviceFeePercentage || 0.5}%)</span>
                <span className="font-bold text-gray-900">{(costBreakdown.serviceFee / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
                </div>

              <div className="flex justify-between items-center py-2 border-t border-green-100">
                <span className="text-gray-700">Platform Deploy Fee (0.1%)</span>
                <span className="font-bold text-gray-900">{(costBreakdown.deploymentPlatformFee / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-t border-green-100">
                <span className="text-gray-700">Monthly Fee ({costBreakdown.initialMonths} month{costBreakdown.initialMonths > 1 ? 's' : ''})</span>
                <span className="font-bold text-gray-900">{(costBreakdown.monthlyFee * costBreakdown.initialMonths / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-t-2 border-green-200">
                <span className="text-gray-900 font-semibold text-lg">Total Payment</span>
                <span className="font-bold text-green-600 text-xl">{costBreakdown.totalPaymentSOL.toFixed(4)} SOL</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Note:</span> The rent exemption will be funded by our backing pool. You only pay the service fee and monthly subscription.
              </p>
            </div>
          </div>
        )}

        {/* Phase: Executing */}
        {(phase === DeploymentPhase.PAYMENT || phase === DeploymentPhase.EXECUTING) && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <svg className="animate-spin h-6 w-6 text-[#0066FF]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <div className="text-gray-900 font-semibold mb-1">
                  {phase === DeploymentPhase.PAYMENT ? 'Processing Payment' : 'Deploying Program'}
                </div>
                <div className="text-gray-600 text-sm">
                  {phase === DeploymentPhase.PAYMENT 
                    ? 'Please confirm the transaction in your wallet...'
                    : 'Deployment is in progress. This may take a few minutes...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase: Complete */}
        {phase === DeploymentPhase.COMPLETE && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="text-gray-900 font-semibold mb-1">Deployment Started!</div>
                <div className="text-gray-600 text-sm">
                  Check the deployment history below for real-time progress.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {phase === DeploymentPhase.INPUT && (
            <button
              type="button"
              onClick={handleVerifyProgram}
              disabled={!canStartVerification || !publicKey}
              className="btn-primary w-full"
            >
              {!publicKey ? (
                'Connect Wallet to Continue'
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Verify Program</span>
            </span>
              )}
            </button>
          )}

          {phase === DeploymentPhase.READY && (
            <>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeployment}
                disabled={!canDeploy}
                className="btn-primary flex-1"
              >
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
                  <span>Pay & Deploy ({costBreakdown?.totalPaymentSOL.toFixed(4)} SOL)</span>
            </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
