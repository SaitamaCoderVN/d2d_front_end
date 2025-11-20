'use client';

import { useEffect, useState, useRef } from 'react';
import { deploymentApi } from '@/lib/api';
import { Deployment, DeploymentStatus } from '@/types';
import toast from 'react-hot-toast';
import { incrementProgramsDeployed } from '@/lib/backerStorage';

interface DeploymentHistoryProps {
  userWalletAddress: string;
  refreshTrigger: number;
}

export default function DeploymentHistory({
  userWalletAddress,
  refreshTrigger,
}: DeploymentHistoryProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const successfulDeploymentsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchDeployments();
  }, [userWalletAddress, refreshTrigger]);

  useEffect(() => {
    const hasActiveDeployment = deployments.some(
      (d) =>
        d.status === DeploymentStatus.PENDING ||
        d.status === DeploymentStatus.DUMPING ||
        d.status === DeploymentStatus.DEPLOYING,
    );

    if (!hasActiveDeployment) return;

    // Poll every 3 seconds for active deployments
    const interval = setInterval(() => {
      fetchDeployments();
    }, 3000);

    return () => clearInterval(interval);
  }, [deployments, userWalletAddress]);

  const fetchDeployments = async () => {
    try {
      const data = await deploymentApi.getByUser(userWalletAddress);
      
      const newSuccessDeployments = data.filter(
        (newDep) =>
          newDep.status === DeploymentStatus.SUCCESS &&
          !deployments.find(
            (oldDep) => oldDep.id === newDep.id && oldDep.status === DeploymentStatus.SUCCESS,
          ),
      );

      newSuccessDeployments.forEach((deployment) => {
        // Check if we've already counted this deployment
        if (deployment.id && !successfulDeploymentsRef.current.has(deployment.id)) {
          successfulDeploymentsRef.current.add(deployment.id);
          
          // Increment programs deployed in localStorage
          incrementProgramsDeployed();
          
          toast.success(
            <div>
              <div className="font-semibold mb-1">🎉 Deployment Complete!</div>
              <div className="text-sm">
                Program deployed to devnet successfully!
              </div>
            </div>,
            { duration: 6000 },
          );
        }
      });

      setDeployments(data);
    } catch (error: any) {
      console.error('Failed to fetch deployments:', error);
      if (error.code !== 'ERR_NETWORK') {
        toast.error('Failed to load deployment history');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: DeploymentStatus) => {
    const configs = {
      [DeploymentStatus.PENDING]: {
        label: 'Pending',
        badgeClass: 'badge-warning',
        icon: '⏳'
      },
      [DeploymentStatus.DUMPING]: {
        label: 'Dumping Program',
        badgeClass: 'badge-blue',
        icon: '📦'
      },
      [DeploymentStatus.DEPLOYING]: {
        label: 'Deploying',
        badgeClass: 'badge-blue',
        icon: '🚀'
      },
      [DeploymentStatus.SUCCESS]: {
        label: 'Success',
        badgeClass: 'badge-success',
        icon: '✅'
      },
      [DeploymentStatus.FAILED]: {
        label: 'Failed',
        badgeClass: 'badge-error',
        icon: '❌'
      }
    };
    return configs[status] || configs[DeploymentStatus.PENDING];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateAddress = (address: string, chars = 4) => {
    if (!address || address === '' || address === 'TBD') {
      return 'N/A';
    }
    if (address.length <= chars * 2) {
      return address; // Don't truncate if already short
    }
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  if (isLoading) {
    return (
      <div className="card p-8">
        <h2 className="section-header mb-8">Deployment History</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="section-header">Deployment History</h2>
        <button
          onClick={fetchDeployments}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
          title="Refresh"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {deployments.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-600 text-lg">
            No deployments yet. Deploy your first program above!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deployments.map((deployment) => {
            const statusConfig = getStatusConfig(deployment.status);
            const isActive = [DeploymentStatus.PENDING, DeploymentStatus.DUMPING, DeploymentStatus.DEPLOYING].includes(deployment.status);
            
            return (
              <div
                key={deployment._id || deployment.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-[#0066FF] transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className={`badge ${statusConfig.badgeClass}`}>
                        <span className="mr-1.5">{statusConfig.icon}</span>
                        {statusConfig.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(deployment.createdAt || deployment.created_at || new Date().toISOString())}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Devnet:</span>
                        {(() => {
                          const devnetProgramId = deployment.devnetProgramId || deployment.devnet_program_id;
                          return devnetProgramId ? (
                            <a
                              href={`https://explorer.solana.com/address/${devnetProgramId}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#0066FF] hover:text-[#0052CC] underline font-mono flex items-center space-x-1"
                            >
                              <code className="text-sm bg-gray-100 px-3 py-1.5 rounded">
                                {truncateAddress(devnetProgramId, 8)}
                              </code>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <code className="text-sm bg-gray-100 px-3 py-1.5 rounded font-mono text-gray-500">
                              N/A
                            </code>
                          );
                        })()}
                      </div>
                      
                      {(deployment.mainnetProgramId || deployment.mainnet_program_id) && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">Mainnet:</span>
                          <a
                            href={`https://explorer.solana.com/address/${deployment.mainnetProgramId || deployment.mainnet_program_id}?cluster=mainnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#0066FF] hover:text-[#0052CC] underline font-mono flex items-center space-x-1"
                          >
                            <span>{truncateAddress(deployment.mainnetProgramId || deployment.mainnet_program_id || '', 8)}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Expires:</span>
                        {(() => {
                          const expiresAt = deployment.subscriptionExpiresAt || deployment.subscription_expires_at;
                          if (expiresAt) {
                            const expiresDate = new Date(expiresAt);
                            const now = new Date();
                            const isExpired = expiresDate < now;
                            const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <code className={`text-sm bg-gray-100 px-3 py-1.5 rounded font-mono ${isExpired ? 'text-red-600' : daysUntilExpiry <= 7 ? 'text-orange-600' : 'text-gray-900'}`}>
                                {isExpired 
                                  ? `Expired ${formatDate(expiresAt)}`
                                  : daysUntilExpiry <= 7
                                  ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
                                  : formatDate(expiresAt)
                                }
                              </code>
                            );
                          }
                          return (
                            <code className="text-sm bg-gray-100 px-3 py-1.5 rounded font-mono text-gray-500">
                              N/A
                            </code>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Progress Steps */}
                    {isActive && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="space-y-3">
                          {[
                            { status: 'completed', label: 'Payment received', icon: '✅' },
                            { 
                              status: deployment.status === DeploymentStatus.PENDING ? 'pending' : 'active',
                              label: 'Dumping .so file from devnet',
                              icon: deployment.status === DeploymentStatus.DUMPING ? '⏳' : '📦'
                            },
                            { 
                              status: deployment.status === DeploymentStatus.DEPLOYING ? 'active' : 'pending',
                              label: 'Deploying to devnet',
                              icon: deployment.status === DeploymentStatus.DEPLOYING ? '⏳' : '🚀'
                            }
                          ].map((step, idx) => (
                            <div key={idx} className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                step.status === 'completed' ? 'bg-green-100 border border-green-300' :
                                step.status === 'active' ? 'bg-blue-100 border border-blue-300 animate-pulse' :
                                'bg-gray-100 border border-gray-200'
                              }`}>
                                {step.status === 'completed' ? (
                                  <svg className="w-4 h-4 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : step.status === 'active' ? (
                                  <svg className="w-3 h-3 text-[#0066FF] animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                                )}
                              </div>
                              <span className={`text-sm ${
                                step.status === 'completed' ? 'text-green-700 font-medium' :
                                step.status === 'active' ? 'text-[#0066FF] font-medium' :
                                'text-gray-400'
                              }`}>
                                {step.icon} {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div className="ml-4">
                      <div className="w-12 h-12 bg-[#0066FF] rounded-lg flex items-center justify-center shadow-blue">
                        <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {(deployment.errorMessage || deployment.error_message) && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>Error:</strong> {deployment.errorMessage || deployment.error_message}
                    </p>
                  </div>
                )}

                {(deployment.paymentSignature || deployment.payment_signature || deployment.transactionSignature || deployment.transaction_signature || deployment.on_chain_deploy_tx || deployment.on_chain_confirm_tx) && (
                  <div className="mt-4 flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    {(deployment.paymentSignature || deployment.payment_signature) && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.paymentSignature || deployment.payment_signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-[#0066FF] hover:text-[#0052CC] font-medium"
                      >
                        <span>💰 Payment TX</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>
                    )}
                    {deployment.on_chain_deploy_tx && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.on_chain_deploy_tx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-[#0066FF] hover:text-[#0052CC] font-medium"
                      >
                        <span>📝 Deploy Request TX</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>
                    )}
                    {(deployment.transactionSignature || deployment.transaction_signature) && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.transactionSignature || deployment.transaction_signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-[#0066FF] hover:text-[#0052CC] font-medium"
                      >
                        <span>🚀 Deploy TX</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>
                    )}
                    {deployment.on_chain_confirm_tx && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.on_chain_confirm_tx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-[#0066FF] hover:text-[#0052CC] font-medium"
                      >
                        <span>✅ Confirm TX</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
