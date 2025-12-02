'use client';

import { useEffect, useState, useRef } from 'react';
import { deploymentApi, closeProgramApi } from '@/lib/api';
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
  const [closingDeploymentId, setClosingDeploymentId] = useState<string | null>(null);
  const successfulDeploymentsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Load successful deployments from localStorage on mount to prevent showing toasts on reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`deployment-toasts-${userWalletAddress}`);
      if (stored) {
        try {
          const storedIds = JSON.parse(stored) as string[];
          successfulDeploymentsRef.current = new Set(storedIds);
        } catch (e) {
          console.warn('Failed to parse stored deployment toasts:', e);
        }
      }
    }
  }, [userWalletAddress]);

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
      
      // On initial load, don't show toasts - just populate the ref
      if (isInitialLoadRef.current) {
        data.forEach((deployment) => {
          if (deployment.status === DeploymentStatus.SUCCESS && deployment.id) {
            successfulDeploymentsRef.current.add(deployment.id);
          }
        });
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `deployment-toasts-${userWalletAddress}`,
            JSON.stringify(Array.from(successfulDeploymentsRef.current))
          );
        }
        isInitialLoadRef.current = false;
        setDeployments(data);
        setIsLoading(false);
        return;
      }
      
      // Only show toast for deployments that just transitioned to SUCCESS
      const newSuccessDeployments = data.filter(
        (newDep) => {
          if (newDep.status !== DeploymentStatus.SUCCESS || !newDep.id) {
            return false;
          }
          
          // Check if this deployment was in a different status before
          const oldDep = deployments.find((d) => d.id === newDep.id);
          const wasJustCompleted = oldDep && oldDep.status !== DeploymentStatus.SUCCESS;
          
          // Also check if we've already shown toast for this deployment
          const alreadyShown = successfulDeploymentsRef.current.has(newDep.id);
          
          return wasJustCompleted && !alreadyShown;
        },
      );

      newSuccessDeployments.forEach((deployment) => {
        if (deployment.id) {
          successfulDeploymentsRef.current.add(deployment.id);
          
          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              `deployment-toasts-${userWalletAddress}`,
              JSON.stringify(Array.from(successfulDeploymentsRef.current))
            );
          }
          
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
        badgeClass: 'badge-slate',
        icon: '⏳'
      },
      [DeploymentStatus.DUMPING]: {
        label: 'Dumping Program',
        badgeClass: 'badge-purple',
        icon: '📦'
      },
      [DeploymentStatus.DEPLOYING]: {
        label: 'Deploying',
        badgeClass: 'badge-purple',
        icon: '🚀'
      },
      [DeploymentStatus.SUCCESS]: {
        label: 'Success',
        badgeClass: 'badge-emerald',
        icon: '✅'
      },
      [DeploymentStatus.FAILED]: {
        label: 'Failed',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
        icon: '❌'
      },
      [DeploymentStatus.CLOSED]: {
        label: 'Closed',
        badgeClass: 'badge-slate',
        icon: '🔒'
      }
    };
    return configs[status] || configs[DeploymentStatus.PENDING];
  };

  const handleCloseProgram = async (deploymentId: string) => {
    if (!deploymentId || deploymentId === '') {
      toast.error('Deployment ID is required');
      return;
    }

    if (!confirm('Are you sure you want to close this program? All SOL will be returned to the treasury pool.')) {
      return;
    }

    setClosingDeploymentId(deploymentId);
    
    try {
      console.log('Closing program:', { deploymentId, userWalletAddress });
      const result = await closeProgramApi.closeProgram(deploymentId, userWalletAddress);
      
      toast.success(
        <div>
          <div className="font-semibold mb-1">✅ Program Closed Successfully!</div>
          <div className="text-sm">
            Recovered {result.recoveredLamports / 1e9} SOL
          </div>
        </div>,
        { duration: 6000 }
      );

      // Refresh deployments list
      await fetchDeployments();
    } catch (error: any) {
      console.error('Failed to close program:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Failed to close program. Please check backend logs for details.';
      
      toast.error(
        <div>
          <div className="font-semibold mb-1">❌ Failed to Close Program</div>
          <div className="text-sm">{errorMessage}</div>
        </div>,
        { duration: 8000 }
      );
    } finally {
      setClosingDeploymentId(null);
    }
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
      <div className="card p-8 border-slate-800 bg-black/20">
        <h2 className="text-lg font-bold text-slate-200 font-mono mb-6 flex items-center gap-2">
          <span className="text-emerald-500">&gt;</span> DEPLOYMENT_HISTORY
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-900/50 rounded-md animate-pulse border border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8 border-slate-800 bg-black/20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-bold text-slate-200 font-mono flex items-center gap-2">
          <span className="text-emerald-500">&gt;</span> DEPLOYMENT_HISTORY
        </h2>
        <button
          onClick={fetchDeployments}
          className="p-2 rounded-md hover:bg-slate-800 transition text-slate-400 hover:text-emerald-400"
          title="Refresh"
        >
          <svg
            className="w-5 h-5"
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
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-lg">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-slate-500 font-mono text-sm">
            // No deployments found.
            <br />
            // Initialize first deployment above.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {deployments.map((deployment) => {
            const statusConfig = getStatusConfig(deployment.status);
            const isActive = [DeploymentStatus.PENDING, DeploymentStatus.DUMPING, DeploymentStatus.DEPLOYING].includes(deployment.status);
            
            return (
              <div
                key={deployment._id || deployment.id}
                className="border border-slate-800 bg-slate-900/30 rounded-md p-4 md:p-6 hover:border-emerald-500/30 transition group overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0"> {/* min-w-0 allows flex children to shrink */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                      <span className={`badge ${statusConfig.badgeClass} font-mono uppercase tracking-wider text-[10px]`}>
                        <span className="mr-1.5">{statusConfig.icon}</span>
                        {statusConfig.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {formatDate(deployment.createdAt || deployment.created_at || new Date().toISOString())}
                      </span>
                    </div>
                    
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-16 shrink-0">DEVNET:</span>
                        <div className="truncate max-w-[200px] md:max-w-xs">
                          {(() => {
                            const devnetProgramId = deployment.devnetProgramId || deployment.devnet_program_id;
                            return devnetProgramId ? (
                              <a
                                href={`https://explorer.solana.com/address/${devnetProgramId}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 transition-colors"
                              >
                                <span className="truncate">{devnetProgramId}</span>
                                <svg className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-slate-600">N/A</span>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {(deployment.mainnetProgramId || deployment.mainnet_program_id) && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 w-16 shrink-0">MAINNET:</span>
                          <div className="truncate max-w-[200px] md:max-w-xs">
                            <a
                              href={`https://explorer.solana.com/address/${deployment.mainnetProgramId || deployment.mainnet_program_id}?cluster=mainnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 transition-colors"
                            >
                              <span className="truncate">{deployment.mainnetProgramId || deployment.mainnet_program_id}</span>
                              <svg className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-16 shrink-0">EXPIRES:</span>
                        {(() => {
                          const expiresAt = deployment.subscriptionExpiresAt || deployment.subscription_expires_at;
                          if (expiresAt) {
                            const expiresDate = new Date(expiresAt);
                            const now = new Date();
                            const isExpired = expiresDate < now;
                            const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            
                            return (
                              <span className={`${isExpired ? 'text-red-400' : daysUntilExpiry <= 7 ? 'text-yellow-400' : 'text-slate-300'} truncate`}>
                                {isExpired 
                                  ? `EXPIRED`
                                  : daysUntilExpiry <= 7
                                  ? `WARNING: ${daysUntilExpiry} DAYS LEFT`
                                  : formatDate(expiresAt)
                                }
                              </span>
                            );
                          }
                          return <span className="text-slate-600">N/A</span>;
                        })()}
                      </div>
                    </div>

                    {/* Progress Steps */}
                    {isActive && (
                      <div className="mt-6 pt-6 border-t border-slate-800 overflow-x-auto">
                        <div className="flex flex-col gap-3 min-w-max">
                          {[
                            { status: 'completed', label: 'Payment received', icon: '✅' },
                            { 
                              status: deployment.status === DeploymentStatus.PENDING ? 'pending' : 'active',
                              label: 'Dumping .so file',
                              icon: deployment.status === DeploymentStatus.DUMPING ? '⏳' : '📦'
                            },
                            { 
                              status: deployment.status === DeploymentStatus.DEPLOYING ? 'active' : 'pending',
                              label: 'Deploying to devnet',
                              icon: deployment.status === DeploymentStatus.DEPLOYING ? '⏳' : '🚀'
                            }
                          ].map((step, idx) => (
                            <div key={idx} className="flex items-center space-x-3">
                              <div className={`w-5 h-5 rounded flex items-center justify-center text-xs border shrink-0 ${
                                step.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                step.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse' :
                                'bg-slate-800 border-slate-700 text-slate-500'
                              }`}>
                                {step.status === 'completed' ? '✓' : (idx + 1)}
                              </div>
                              <span className={`text-xs font-mono ${
                                step.status === 'completed' ? 'text-emerald-400' :
                                step.status === 'active' ? 'text-emerald-400' :
                                'text-slate-500'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 md:ml-4 shrink-0">
                    {isActive && (
                      <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
                        <svg className="animate-spin h-4 w-4 text-emerald-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}

                    {deployment.status === DeploymentStatus.SUCCESS && (
                      <button
                        onClick={() => handleCloseProgram(deployment.id || deployment._id || '')}
                        disabled={closingDeploymentId === (deployment.id || deployment._id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 hover:text-red-400 rounded text-xs font-mono transition flex items-center gap-2"
                      >
                        {closingDeploymentId === (deployment.id || deployment._id) ? (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span>CLOSE</span>
                      </button>
                    )}
                  </div>
                </div>

                {(deployment.errorMessage || deployment.error_message) && (
                  <div className="mt-4 p-3 bg-red-900/10 border border-red-500/20 rounded">
                    <p className="text-xs text-red-400 font-mono break-words">
                      <strong className="text-red-300">ERROR:</strong> {deployment.errorMessage || deployment.error_message}
                    </p>
                  </div>
                )}

                {(deployment.paymentSignature || deployment.payment_signature || deployment.transactionSignature || deployment.transaction_signature || deployment.on_chain_deploy_tx || deployment.on_chain_confirm_tx) && (
                  <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-800">
                    {(deployment.paymentSignature || deployment.payment_signature) && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.paymentSignature || deployment.payment_signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[10px] text-slate-400 hover:text-emerald-400 font-mono bg-slate-800/50 px-2 py-1 rounded border border-slate-700 hover:border-emerald-500/30 transition-colors"
                      >
                        <span>PAYMENT</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {deployment.on_chain_deploy_tx && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.on_chain_deploy_tx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[10px] text-slate-400 hover:text-emerald-400 font-mono bg-slate-800/50 px-2 py-1 rounded border border-slate-700 hover:border-emerald-500/30 transition-colors"
                      >
                        <span>REQUEST_TX</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {(deployment.transactionSignature || deployment.transaction_signature) && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.transactionSignature || deployment.transaction_signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono bg-emerald-900/10 px-2 py-1 rounded border border-emerald-500/20 transition-colors"
                      >
                        <span>DEPLOY_TX</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {deployment.on_chain_confirm_tx && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.on_chain_confirm_tx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono bg-emerald-900/10 px-2 py-1 rounded border border-emerald-500/20 transition-colors"
                      >
                        <span>CONFIRM_TX</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
