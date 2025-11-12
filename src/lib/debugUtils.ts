import { Connection, PublicKey } from '@solana/web3.js';
import { getBackerDepositPda, getTreasuryPoolPda, D2D_PROGRAM_ID } from './d2dProgram';

/**
 * Debug utility to check account states and help troubleshoot claim rewards issues
 */
export const debugClaimRewards = async (
  connection: Connection,
  lenderPubkey: PublicKey,
): Promise<void> => {
  console.group('🔍 Debug Claim Rewards');
  
  try {
    // 1. Check Program ID
    console.log('Program ID:', D2D_PROGRAM_ID.toString());
    
    // 2. Check Treasury Pool
    const treasuryPoolPda = getTreasuryPoolPda();
    console.log('Treasury Pool PDA:', treasuryPoolPda.toString());
    
    const treasuryInfo = await connection.getAccountInfo(treasuryPoolPda);
    if (treasuryInfo) {
      console.log('✅ Treasury Pool exists');
      console.log('  - Balance:', treasuryInfo.lamports / 1e9, 'SOL');
      console.log('  - Owner:', treasuryInfo.owner.toString());
      console.log('  - Data length:', treasuryInfo.data.length, 'bytes');
    } else {
      console.error('❌ Treasury Pool does not exist!');
    }
    
    // 3. Check Lender Stake Account
    const lenderStakePda = getBackerDepositPda(lenderPubkey);
    console.log('Lender Stake PDA:', lenderStakePda.toString());
    
    const stakeInfo = await connection.getAccountInfo(lenderStakePda);
    if (stakeInfo) {
      console.log('✅ Lender Stake account exists');
      console.log('  - Balance:', stakeInfo.lamports / 1e9, 'SOL');
      console.log('  - Owner:', stakeInfo.owner.toString());
      console.log('  - Data length:', stakeInfo.data.length, 'bytes');
      
      // Try to decode basic info (first few fields)
      if (stakeInfo.data.length >= 40) {
        const backerPubkey = new PublicKey(stakeInfo.data.slice(8, 40));
        console.log('  - Backer pubkey:', backerPubkey.toString());
        
        if (stakeInfo.data.length >= 48) {
          const depositedAmount = stakeInfo.data.readBigUInt64LE(40);
          console.log('  - Deposited amount:', Number(depositedAmount) / 1e9, 'SOL');
        }
      }
    } else {
      console.error('❌ Lender Stake account does not exist!');
      console.log('   → User needs to stake SOL first');
    }
    
    // 4. Check Lender Balance
    const lenderBalance = await connection.getBalance(lenderPubkey);
    console.log('Lender wallet balance:', lenderBalance / 1e9, 'SOL');
    
    // 5. Check Network
    const version = await connection.getVersion();
    console.log('Network:', version);
    
    // 6. Summary
    console.log('\n📋 Summary:');
    const canClaim = treasuryInfo !== null && stakeInfo !== null;
    if (canClaim) {
      console.log('✅ All accounts exist - claim should work (if rewards > 0)');
    } else {
      console.log('❌ Missing accounts - claim will fail');
      if (!treasuryInfo) console.log('   - Treasury pool needs to be initialized');
      if (!stakeInfo) console.log('   - User needs to stake SOL first');
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.groupEnd();
};

/**
 * Quick check if user can claim rewards
 */
export const canUserClaimRewards = async (
  connection: Connection,
  lenderPubkey: PublicKey,
): Promise<{ canClaim: boolean; reason?: string }> => {
  try {
    const treasuryPoolPda = getTreasuryPoolPda();
    const lenderStakePda = getBackerDepositPda(lenderPubkey);
    
    const [treasuryInfo, stakeInfo] = await Promise.all([
      connection.getAccountInfo(treasuryPoolPda),
      connection.getAccountInfo(lenderStakePda),
    ]);
    
    if (!treasuryInfo) {
      return { canClaim: false, reason: 'Treasury pool not initialized' };
    }
    
    if (!stakeInfo) {
      return { canClaim: false, reason: 'Stake account not found - please stake SOL first' };
    }
    
    return { canClaim: true };
  } catch (error) {
    return { canClaim: false, reason: `Error checking accounts: ${error}` };
  }
};

