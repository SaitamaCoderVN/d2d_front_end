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

export default api;

