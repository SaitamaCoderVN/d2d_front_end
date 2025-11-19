import { AnchorProvider, BN, Idl, BorshInstructionCoder } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import rawIdl from '@/idl/d2d_program_sol.json';

const idlCandidate = rawIdl as { default?: Idl } | Idl;

const resolvedIdl = ('default' in idlCandidate ? idlCandidate.default : idlCandidate) as Idl;

if (!(resolvedIdl as any).__logged) {
  console.debug('[D2D] Loaded IDL keys:', Object.keys(resolvedIdl));
  (resolvedIdl as any).__logged = true;
}

if (!resolvedIdl.accounts || resolvedIdl.accounts.length === 0) {
  console.error('[D2D] Loaded IDL has no accounts section. Ensure full IDL JSON is copied.');
}

export const D2D_PROGRAM_ID = new PublicKey((resolvedIdl as any).address);
export const TREASURY_POOL_SEED = Buffer.from('treasury_pool');
export const LENDER_STAKE_SEED = Buffer.from('lender_stake');

const instructionCoder = new BorshInstructionCoder(resolvedIdl);

export type AnchorWallet = {
  publicKey: PublicKey;
  signTransaction: NonNullable<WalletContextState['signTransaction']>;
  signAllTransactions: NonNullable<WalletContextState['signAllTransactions']>;
  sendTransaction: NonNullable<WalletContextState['sendTransaction']>;
};

export const getAnchorProvider = (
  connection: Connection,
  wallet: WalletContextState,
): AnchorProvider => {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions || !wallet.sendTransaction) {
    throw new Error('Wallet does not support required signing methods');
  }

  return new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
      sendTransaction: wallet.sendTransaction,
    } as AnchorWallet,
    { commitment: 'confirmed' },
  );
};

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

export const getRewardPoolPda = (): PublicKey => {
  const [rewardPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_pool')],
    D2D_PROGRAM_ID
  );
  return rewardPool;
};

export const getPlatformPoolPda = (): PublicKey => {
  const [platformPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_pool')],
    D2D_PROGRAM_ID
  );
  return platformPool;
};

export const createStakeSolInstruction = (
  amountLamports: number,
  lockPeriod: number,
  lender: PublicKey,
): TransactionInstruction => {
  const data = instructionCoder.encode('stake_sol', {
    amount: new BN(amountLamports),
    lockPeriod: new BN(lockPeriod),
  });

  const treasuryPoolPda = getTreasuryPoolPda();
  const lenderStakePda = getBackerDepositPda(lender);

  // Updated stake_sol instruction (NO FEES from backer):
  // 1. treasury_pool (mut) - TreasuryPool state account
  // 2. treasury_pda (mut) - Treasury Pool PDA (receives 100% of deposit)
  // 3. lender_stake (mut) - BackerDeposit account
  // 4. lender (mut, signer) - Backer wallet
  // 5. system_program - System program

  return new TransactionInstruction({
    programId: D2D_PROGRAM_ID,
    keys: [
      { pubkey: treasuryPoolPda, isWritable: true, isSigner: false },      // treasury_pool
      { pubkey: treasuryPoolPda, isWritable: true, isSigner: false },      // treasury_pda (same as treasury_pool)
      { pubkey: lenderStakePda, isWritable: true, isSigner: false },       // lender_stake
      { pubkey: lender, isWritable: true, isSigner: true },                 // lender
      { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }, // system_program
    ],
    data,
  });
};

export const createClaimRewardsInstruction = (lender: PublicKey): TransactionInstruction => {
  const data = instructionCoder.encode('claim_rewards', {});

  const treasuryPoolPda = getTreasuryPoolPda();
  const lenderStakePda = getBackerDepositPda(lender);

  console.log('[D2D] Claim Rewards Accounts:', {
    treasuryPool: treasuryPoolPda.toString(),
    lenderStake: lenderStakePda.toString(),
    lender: lender.toString(),
    systemProgram: SystemProgram.programId.toString(),
  });

  console.log('[D2D] Instruction data (hex):', Buffer.from(data).toString('hex'));
  console.log('[D2D] Instruction data (base64):', Buffer.from(data).toString('base64'));
  console.log('[D2D] Instruction data length:', data.length);

  // Get reward pool and platform pool PDAs
  const [rewardPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_pool')],
    D2D_PROGRAM_ID
  );
  
  const [platformPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform_pool')],
    D2D_PROGRAM_ID
  );

  const instruction = new TransactionInstruction({
    programId: D2D_PROGRAM_ID,
    keys: [
      { pubkey: treasuryPoolPda, isWritable: true, isSigner: false },      // treasury_pool
      { pubkey: rewardPoolPda, isWritable: true, isSigner: false },      // reward_pool
      { pubkey: platformPoolPda, isWritable: true, isSigner: false },     // platform_pool
      { pubkey: treasuryPoolPda, isWritable: true, isSigner: false },     // treasury_pda (same as treasury_pool)
      { pubkey: lenderStakePda, isWritable: true, isSigner: false },      // lender_stake
      { pubkey: lender, isWritable: true, isSigner: true },                // lender
      { pubkey: SystemProgram.programId, isWritable: false, isSigner: false }, // system_program
    ],
    data,
  });

  console.log('[D2D] Full instruction:', {
    programId: instruction.programId.toString(),
    keys: instruction.keys.map(k => ({
      pubkey: k.pubkey.toString(),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    dataLength: instruction.data.length,
  });

  return instruction;
};

export const prepareTransaction = async (
  connection: Connection,
  payer: PublicKey,
  instruction: TransactionInstruction,
): Promise<Transaction> => {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  
  console.log('[D2D] Recent blockhash:', blockhash);
  console.log('[D2D] Last valid block height:', lastValidBlockHeight);
  
  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight });
  tx.add(instruction);
  
  console.log('[D2D] Transaction prepared:', {
    feePayer: tx.feePayer?.toString(),
    recentBlockhash: tx.recentBlockhash,
    instructions: tx.instructions.length,
  });
  
  return tx;
};

export const toBN = (amount: number): BN => {
  return new BN(Math.floor(amount));
};

/**
 * Check if a lender stake account exists for the given wallet
 */
export const checkStakeAccountExists = async (
  connection: Connection,
  lender: PublicKey,
): Promise<boolean> => {
  try {
    const stakePda = getBackerDepositPda(lender);
    const accountInfo = await connection.getAccountInfo(stakePda);
    return accountInfo !== null;
  } catch (error) {
    console.error('Error checking stake account:', error);
    return false;
  }
};
