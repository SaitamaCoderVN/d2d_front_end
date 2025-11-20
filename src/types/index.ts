export enum DeploymentStatus {
  PENDING = 'pending',
  DUMPING = 'dumping',
  DEPLOYING = 'deploying',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface Deployment {
  _id?: string;
  id?: string;
  user_wallet_address?: string;
  userWalletAddress?: string;
  devnet_program_id?: string;
  devnetProgramId?: string;
  mainnet_program_id?: string;
  mainnetProgramId?: string;
  deployer_wallet_address?: string;
  deployerWalletAddress?: string;
  status: DeploymentStatus;
  payment_signature?: string;
  paymentSignature?: string;
  transaction_signature?: string;
  transactionSignature?: string;
  on_chain_deploy_tx?: string;
  on_chain_confirm_tx?: string;
  error_message?: string;
  errorMessage?: string;
  service_fee?: number;
  serviceFee?: number;
  deployment_platform_fee?: number;
  deploymentPlatformFee?: number;
  deployment_cost?: number;
  deploymentCost?: number;
  program_hash?: string;
  subscription_expires_at?: string;
  subscriptionExpiresAt?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface CreateDeploymentRequest {
  userWalletAddress: string;
  devnetProgramId: string;
  paymentSignature?: string;
}

// Phase 1: Verify Program
export interface VerifyProgramRequest {
  programId: string;
}

export interface VerifyProgramResponse {
  isValid: boolean;
  programId: string;
  programSize?: number;
  error?: string;
}

// Phase 2: Calculate Cost
export interface CalculateCostRequest {
  programId: string;
}

export interface CostBreakdown {
  programSize: number;
  rentCost: number;
  serviceFee: number;
  deploymentPlatformFee: number;
  monthlyFee: number;
  initialMonths: number;
  totalPayment: number;
  totalPaymentSOL: number;
  programHash: string;
}

// Phase 3: Execute Deploy
export interface ExecuteDeployRequest {
  userWalletAddress: string;
  devnetProgramId: string;
  paymentSignature: string;
  serviceFee: number;
  deploymentPlatformFee: number;
  monthlyFee: number;
  initialMonths: number;
  deploymentCost: number;
  programHash: string;
}

export interface ExecuteDeployResponse {
  deploymentId: string;
  status: DeploymentStatus;
  message: string;
}

// Config
export interface AppConfig {
  programId: string;
  serviceFeePercentage: number;
  monthlyFeeLamports: number;
  environment: 'devnet' | 'mainnet';
  currentRpc: string;
  rpcEndpoints: {
    devnet: string;
    mainnet: string;
  };
}

