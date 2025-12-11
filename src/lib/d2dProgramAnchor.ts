/**
 * Alternative implementation using Anchor Program client directly
 * This is more reliable than manually building instructions
 */

import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import rawIdl from '@/idl/d2d_program_sol.json';
import type { D2dProgramSol } from '@/types/d2d_program_sol';

const idlCandidate = rawIdl as { default?: any } | any;
const resolvedIdl = ('default' in idlCandidate ? idlCandidate.default : idlCandidate);

export const D2D_PROGRAM_ID = new PublicKey(resolvedIdl.address);
export const TREASURY_POOL_SEED = Buffer.from('treasury_pool');
export const LENDER_STAKE_SEED = Buffer.from('lender_stake');

export const getTreasuryPoolPda = (): PublicKey => {
  const [treasuryPool] = PublicKey.findProgramAddressSync([TREASURY_POOL_SEED], D2D_PROGRAM_ID);
  return treasuryPool;
};

export const getBackerDepositPda = (backer: PublicKey): PublicKey => {
  const [deposit] = PublicKey.findProgramAddressSync([
    LENDER_STAKE_SEED,
    backer.toBuffer(),
  ], D2D_PROGRAM_ID);
  return deposit;
};

/**
 * Create Anchor provider from wallet
 */
export const createProvider = (
  connection: Connection,
  wallet: WalletContextState,
): AnchorProvider => {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
    throw new Error('Wallet not connected or does not support required methods');
  }

  return new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    } as any,
    { commitment: 'confirmed' },
  );
};

/**
 * Get Anchor program instance
 */
export const getProgram = (provider: AnchorProvider): Program<D2dProgramSol> => {
  return new Program<D2dProgramSol>(resolvedIdl as any, provider);
};

/**
 * Stake SOL using Anchor client
 */
export const stakeSolAnchor = async (
  connection: Connection,
  wallet: WalletContextState,
  amountLamports: number,
  lockPeriod: number,
): Promise<string> => {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const provider = createProvider(connection, wallet);
  const program = getProgram(provider);

  const treasuryPoolPda = getTreasuryPoolPda();
  const lenderStakePda = getBackerDepositPda(wallet.publicKey);

  console.log('[Anchor] Staking SOL:', {
    amount: amountLamports / 1e9,
    lockPeriod,
    treasuryPool: treasuryPoolPda.toString(),
    lenderStake: lenderStakePda.toString(),
    lender: wallet.publicKey.toString(),
  });

  // NO reward_pool or platform_pool needed - 100% of deposit goes to TreasuryPool
  // Fees come from developers when they pay for deployments

  const tx = await program.methods
    .stakeSol(new BN(amountLamports), new BN(lockPeriod))
    .accountsPartial({
      treasuryPool: treasuryPoolPda,
      treasuryPda: treasuryPoolPda, // Same as treasuryPool
      lenderStake: lenderStakePda,
      lender: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('[Anchor] Stake transaction:', tx);
  return tx;
};

/**
 * Unstake SOL using Anchor client
 */
export const unstakeSolAnchor = async (
  connection: Connection,
  wallet: WalletContextState,
  amountLamports: number,
): Promise<string> => {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // Validate amount
  if (!amountLamports || amountLamports <= 0 || !Number.isInteger(amountLamports)) {
    throw new Error(`Invalid amount: ${amountLamports}. Must be a positive integer in lamports.`);
  }

  const provider = createProvider(connection, wallet);
  const program = getProgram(provider);

  const treasuryPoolPda = getTreasuryPoolPda();
  const lenderStakePda = getBackerDepositPda(wallet.publicKey);

  const amountBN = new BN(amountLamports);
  console.log('[Anchor] Unstaking SOL:', {
    amount: amountLamports / 1e9,
    amountLamports,
    amountBN: amountBN.toString(),
    treasuryPool: treasuryPoolPda.toString(),
    lenderStake: lenderStakePda.toString(),
    lender: wallet.publicKey.toString(),
  });

  try {
    // Build transaction first for simulation
    const transaction = await program.methods
      .unstakeSol(amountBN)
      .accountsPartial({
        treasuryPool: treasuryPoolPda,
        treasuryPda: treasuryPoolPda,
        lenderStake: lenderStakePda,
        lender: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    // Set fee payer and recent blockhash for simulation
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Simulate transaction first to get detailed error logs
    console.log('[Anchor] Simulating unstake transaction...');
    const simulation = await connection.simulateTransaction(transaction);
    
    if (simulation.value.err) {
      console.error('[Anchor] Simulation failed:', simulation.value.err);
      console.error('[Anchor] Simulation logs:', simulation.value.logs);
      
      // Try to extract error message from logs
      const logs = simulation.value.logs || [];
      const errorLog = logs.find((log: string) => 
        log.includes('Error:') || 
        log.includes('failed:') || 
        log.includes('invalid') ||
        log.includes('Invalid')
      );
      
      if (errorLog) {
        console.error('[Anchor] Error from logs:', errorLog);
        throw new Error(`Transaction simulation failed: ${errorLog}`);
      }
      
      throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
    }
    
    console.log('[Anchor] Simulation successful, sending transaction...');
    
    // If simulation succeeds, send the transaction
  const tx = await program.methods
      .unstakeSol(amountBN)
    .accountsPartial({
      treasuryPool: treasuryPoolPda,
      treasuryPda: treasuryPoolPda,
      lenderStake: lenderStakePda,
      lender: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('[Anchor] Unstake transaction:', tx);
  return tx;
  } catch (error: any) {
    console.error('[Anchor] Unstake error details:', {
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      transactionLogs: error.transactionLogs,
      programErrorStack: error.programErrorStack,
      amountLamports,
      amountBN: amountBN.toString(),
      treasuryPool: treasuryPoolPda.toString(),
      lenderStake: lenderStakePda.toString(),
    });
    
    // Log full error object for debugging
    if (error.logs) {
      console.error('[Anchor] Error logs:', error.logs);
    }
    if (error.programErrorStack) {
      console.error('[Anchor] Program error stack:', error.programErrorStack);
    }
    
    throw error;
  }
};

/**
 * Claim rewards using Anchor client
 */
export const claimRewardsAnchor = async (
  connection: Connection,
  wallet: WalletContextState,
): Promise<string> => {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const provider = createProvider(connection, wallet);
  const program = getProgram(provider);

  const treasuryPoolPda = getTreasuryPoolPda();
  const lenderStakePda = getBackerDepositPda(wallet.publicKey);

  console.log('[Anchor] Claiming rewards:', {
    treasuryPool: treasuryPoolPda.toString(),
    lenderStake: lenderStakePda.toString(),
    lender: wallet.publicKey.toString(),
  });

  // First, let's fetch the stake account to check rewards
  try {
    const stakeAccount = await program.account.backerDeposit.fetch(lenderStakePda);
    console.log('[Anchor] Stake account data:', {
      backer: stakeAccount.backer.toString(),
      depositedAmount: stakeAccount.depositedAmount?.toString() || '0',
      rewardDebt: stakeAccount.rewardDebt?.toString() || '0',
      claimedTotal: stakeAccount.claimedTotal?.toString() || '0',
      isActive: stakeAccount.isActive || false,
      bump: stakeAccount.bump || 0,
    });
  } catch (error) {
    console.error('[Anchor] Failed to fetch stake account:', error);
  }

  // Derive Reward Pool PDA (needed for both simulation and execution)
  const [rewardPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_pool')],
    D2D_PROGRAM_ID
  );

  // Build transaction for manual simulation
  const transaction = await program.methods
    .claimRewards()
    .accountsPartial({
      treasuryPool: treasuryPoolPda,
      rewardPool: rewardPoolPda, // Required account for claim_rewards
      lenderStake: lenderStakePda,
      lender: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Simulate using RPC directly for better error details
  try {
    console.log('[Anchor] Simulating transaction via RPC...');
    const simulation = await connection.simulateTransaction(transaction);
    
    console.log('[Anchor] RPC Simulation result:', simulation);
    console.log('[Anchor] Simulation logs:', simulation.value.logs);
    
    if (simulation.value.err) {
      console.error('[Anchor] Simulation error:', simulation.value.err);
      
      // Parse logs for specific error
      const logs = simulation.value.logs || [];
      const errorLog = logs.find(log => log.includes('Error:') || log.includes('failed:'));
      
      if (errorLog) {
        console.error('[Anchor] Program error from logs:', errorLog);
        throw new Error(errorLog);
      }
      
      throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
    }
    
    console.log('[Anchor] Simulation successful!');
  } catch (simError: any) {
    console.error('[Anchor] Simulation failed:', simError);
    throw simError;
  }

  // Execute transaction (rewardPoolPda already derived above)
  const tx = await program.methods
    .claimRewards()
    .accountsPartial({
      treasuryPool: treasuryPoolPda,
      rewardPool: rewardPoolPda,
      lenderStake: lenderStakePda,
      lender: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('[Anchor] Claim transaction:', tx);
  return tx;
};

/**
 * Fetch stake account data
 */
export const fetchStakeAccount = async (
  connection: Connection,
  wallet: WalletContextState,
) => {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const provider = createProvider(connection, wallet);
  const program = getProgram(provider);
  const lenderStakePda = getBackerDepositPda(wallet.publicKey);

  try {
    const stakeAccount = await program.account.backerDeposit.fetch(lenderStakePda);
    return {
      exists: true,
      data: stakeAccount,
    };
  } catch (error) {
    return {
      exists: false,
      error: error,
    };
  }
};

/**
 * Fetch treasury pool data
 */
export const fetchTreasuryPool = async (
  connection: Connection,
  wallet: WalletContextState,
) => {
  try {
    const provider = createProvider(connection, wallet);
    const program = getProgram(provider);
    const treasuryPoolPda = getTreasuryPoolPda();

    // First check if account exists
    const accountInfo = await connection.getAccountInfo(treasuryPoolPda);
    if (!accountInfo) {
      console.warn('[fetchTreasuryPool] Treasury Pool account does not exist');
      return {
        exists: false,
        error: new Error('Treasury Pool account not found'),
      };
    }

    // Try to fetch using Anchor
    try {
      const treasuryPool = await program.account.treasuryPool.fetch(treasuryPoolPda);
      return {
        exists: true,
        data: treasuryPool,
      };
    } catch (fetchError: any) {
      console.error('[fetchTreasuryPool] Failed to deserialize:', fetchError.message);
      
      // If deserialization fails, account might have old layout
      if (fetchError.message?.includes('AccountDidNotDeserialize') || 
          fetchError.message?.includes('offset') ||
          fetchError.message?.includes('Failed to deserialize')) {
        console.error('[fetchTreasuryPool] Account exists but has incompatible layout');
        console.error('[fetchTreasuryPool] Account size:', accountInfo.data.length);
        console.error('[fetchTreasuryPool] Expected size: ~278 bytes (new layout)');
        console.error('[fetchTreasuryPool] Solution: Reset and reinitialize treasury pool');
      }
      
      return {
        exists: false,
        error: fetchError,
      };
    }
  } catch (error: any) {
    console.error('[fetchTreasuryPool] Error:', error.message);
    return {
      exists: false,
      error: error,
    };
  }
};
