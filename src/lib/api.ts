import axios from 'axios';
import {
  Deployment,
  CreateDeploymentRequest,
  VerifyProgramRequest,
  VerifyProgramResponse,
  CalculateCostRequest,
  CostBreakdown,
  ExecuteDeployRequest,
  ExecuteDeployResponse,
  AppConfig,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const configApi = {
  /**
   * Get treasury wallet and program configuration
   */
  getTreasuryConfig: async (): Promise<AppConfig> => {
    const response = await api.get<AppConfig>('/api/config/treasury');
    return response.data;
  },

  /**
   * Health check
   */
  healthCheck: async (): Promise<{ status: string; healthy: boolean }> => {
    const response = await api.get('/api/config/health');
    return response.data;
  },
};

export const deploymentApi = {
  /**
   * Phase 1: Verify program exists on devnet
   */
  verifyProgram: async (data: VerifyProgramRequest): Promise<VerifyProgramResponse> => {
    const response = await api.post<VerifyProgramResponse>('/api/deployments/verify', data);
    return response.data;
  },

  /**
   * Phase 2: Calculate deployment costs
   */
  calculateCost: async (data: CalculateCostRequest): Promise<CostBreakdown> => {
    const response = await api.post<CostBreakdown>('/api/deployments/calculate-cost', data);
    return response.data;
  },

  /**
   * Phase 3: Execute deployment
   */
  executeDeploy: async (data: ExecuteDeployRequest): Promise<ExecuteDeployResponse> => {
    const response = await api.post<ExecuteDeployResponse>('/api/deployments/execute', data);
    return response.data;
  },

  /**
   * Get deployments by user wallet address
   */
  getByUser: async (userWalletAddress: string): Promise<Deployment[]> => {
    const response = await api.get<Deployment[]>('/api/deployments', {
      params: { userWalletAddress },
    });
    return response.data;
  },

  /**
   * Get deployment by ID
   */
  getById: async (id: string): Promise<Deployment> => {
    const response = await api.get<Deployment>(`/api/deployments/${id}`);
    return response.data;
  },

  /**
   * Get all deployments
   */
  getAll: async (): Promise<Deployment[]> => {
    const response = await api.get<Deployment[]>('/api/deployments');
    return response.data;
  },

  /**
   * Legacy method for backward compatibility
   * @deprecated Use verifyProgram -> calculateCost -> executeDeploy instead
   */
  create: async (data: CreateDeploymentRequest): Promise<Deployment> => {
    const response = await api.post<Deployment>('/api/deployments', data);
    return response.data;
  },
};

export const closeProgramApi = {
  /**
   * Close a deployed program and return all SOL to treasury pool
   */
  closeProgram: async (deploymentId: string, userWalletAddress: string): Promise<{
    deploymentId: string;
    status: string;
    closeSignature: string;
    refundSignature?: string;
    recoveredLamports: number;
    message: string;
  }> => {
    const response = await api.post('/api/close-program', {
      deploymentId,
      userWalletAddress,
    });
    return response.data;
  },
};

export interface PoolState {
  rewardPerShare: string;
  totalDeposited: number; // lamports
  liquidBalance: number; // lamports - Available for deployment
  rewardPoolBalance: number; // lamports
  platformPoolBalance: number; // lamports
  treasuryPoolPDA: string;
  availableForDeploySOL: number; // SOL (not lamports)
}

export interface LeaderboardEntry {
  wallet: string;
  depositedAmount: number; // lamports
  claimableRewards: number; // lamports
  claimedTotal: number; // lamports
  isActive: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  rewardPoolBalance: number; // lamports - Total SOL in reward pool
  rewardPoolAddress: string; // Reward pool PDA address
}

export interface UserStakeInfo {
  wallet: string;
  depositedAmount: number; // lamports
  claimableRewards: number; // lamports
  claimedTotal: number; // lamports
  isActive: boolean;
  totalRewards: number; // lamports (claimable + claimed)
}

export interface UtilizationData {
  history: Array<{ date: string; solUsed: number; deploymentCount: number }>;
  currentUtilizationRate: number;
  projectedApy: number;
}

export const poolApi = {
  /**
   * Get current treasury pool state
   */
  getPoolState: async (): Promise<PoolState> => {
    const response = await api.get<PoolState>('/api/pool/state');
    return response.data;
  },

  /**
   * Get pool utilization history and projected APY
   */
  getUtilization: async (): Promise<UtilizationData> => {
    const response = await api.get<UtilizationData>('/api/pool/utilization');
    return response.data;
  },

  /**
   * Get leaderboard of all backers sorted by claimable rewards
   */
  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    const response = await api.get<LeaderboardResponse>('/api/pool/leaderboard');
    return response.data;
  },

  /**
   * Get user's stake and reward information
   */
  getUserStakeInfo: async (wallet: string): Promise<UserStakeInfo> => {
    const response = await api.get<UserStakeInfo>(`/api/pool/user/${wallet}`);
    return response.data;
  },
};

export interface PointsInfo {
  walletAddress: string;
  totalPoints: number;
  currentDeposit: number;
  currentDepositSOL: number;
  lastSyncTime?: string;
}

export const pointsApi = {
  /**
   * Get points for a wallet address
   */
  getPoints: async (walletAddress: string): Promise<PointsInfo> => {
    const response = await api.get<{ success: boolean; data: PointsInfo; error?: string }>(`/api/points/${walletAddress}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get points');
  },
};

export default api;

