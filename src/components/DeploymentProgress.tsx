'use client';

import { useState, useEffect, useCallback } from 'react';
import { deploymentApi } from '@/lib/api';
import { Deployment, DeploymentStatus } from '@/types';

interface DeploymentProgressProps {
  deploymentId: string;
  onComplete?: (deployment: Deployment) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface DeploymentStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  timestamp?: string;
}

export default function DeploymentProgress({
  deploymentId,
  onComplete,
  onError,
  className = ''
}: DeploymentProgressProps) {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [steps, setSteps] = useState<DeploymentStep[]>([]);
  const [isPolling, setIsPolling] = useState(false); // Start as false, will be set to true only if deployment is active
  const [logs, setLogs] = useState<Array<{ message: string; level: string; phase: string; timestamp: string }>>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Check if error is admin mismatch
  const isAdminMismatchError = (error: string | undefined | null): boolean => {
    if (!error) return false;
    return error.toLowerCase().includes('admin mismatch') || 
           error.toLowerCase().includes('treasury pool admin');
  };

  // Extract admin addresses from error message
  const extractAdminInfo = (error: string | undefined | null): { treasuryAdmin?: string; backendAdmin?: string } => {
    if (!error) return {};
    const treasuryMatch = error.match(/Treasury pool admin is ([A-Za-z0-9]{32,44})/);
    const backendMatch = error.match(/backend admin is ([A-Za-z0-9]{32,44})/);
    return {
      treasuryAdmin: treasuryMatch ? treasuryMatch[1] : undefined,
      backendAdmin: backendMatch ? backendMatch[1] : undefined,
    };
  };

  // Get error message from deployment
  const getErrorMessage = (deployment: Deployment): string | undefined => {
    return deployment.errorMessage || deployment.error_message || undefined;
  };

  // Get logs from deployment
  const getLogs = (deployment: Deployment): string[] => {
    // Logs might come from backend API response but not in type
    return (deployment as any).logs || [];
  };

  // Get deployed program ID
  const getDeployedProgramId = (deployment: Deployment): string | undefined => {
    return deployment.mainnetProgramId || deployment.mainnet_program_id || (deployment as any).deployedProgramId;
  };

  // Define deployment steps
  const getStepsFromStatus = useCallback((status: DeploymentStatus, deployment: Deployment): DeploymentStep[] => {
    const baseSteps: DeploymentStep[] = [
      {
        id: 'verify',
        label: 'Verify Program',
        description: 'Checking program exists on devnet',
        status: 'pending',
      },
      {
        id: 'dump',
        label: 'Dump Program',
        description: 'Extracting program binary from devnet',
        status: 'pending',
      },
      {
        id: 'create_request',
        label: 'Create Deploy Request',
        description: 'Creating on-chain deployment request',
        status: 'pending',
      },
      {
        id: 'fund',
        label: 'Fund Wallet',
        description: 'Funding temporary wallet from treasury',
        status: 'pending',
      },
      {
        id: 'deploy',
        label: 'Deploy Program',
        description: 'Deploying program to Solana mainnet',
        status: 'pending',
      },
      {
        id: 'confirm',
        label: 'Confirm Deployment',
        description: 'Verifying deployment success',
        status: 'pending',
      },
    ];

    // Update step statuses based on deployment status
    switch (status) {
      case DeploymentStatus.PENDING:
        baseSteps[0].status = 'active';
        break;
      case DeploymentStatus.DUMPING:
        baseSteps[0].status = 'completed';
        baseSteps[1].status = 'active';
        break;
      case DeploymentStatus.DEPLOYING:
        baseSteps[0].status = 'completed';
        baseSteps[1].status = 'completed';
        baseSteps[2].status = 'completed';
        baseSteps[3].status = 'completed';
        baseSteps[4].status = 'active';
        break;
      case DeploymentStatus.SUCCESS:
        baseSteps.forEach(step => step.status = 'completed');
        break;
      case DeploymentStatus.FAILED:
        // Determine which step failed based on error message
        const error = getErrorMessage(deployment) || '';
        if (error.includes('Admin mismatch') || error.includes('create deploy request')) {
          baseSteps[0].status = 'completed';
          baseSteps[1].status = 'completed';
          baseSteps[2].status = 'error';
        } else if (error.includes('fund') || error.includes('treasury')) {
          baseSteps[0].status = 'completed';
          baseSteps[1].status = 'completed';
          baseSteps[2].status = 'completed';
          baseSteps[3].status = 'error';
        } else if (error.includes('deploy')) {
          baseSteps[0].status = 'completed';
          baseSteps[1].status = 'completed';
          baseSteps[2].status = 'completed';
          baseSteps[3].status = 'completed';
          baseSteps[4].status = 'error';
        } else {
          // Generic error - mark active step as error
        baseSteps.forEach((step, index) => {
          if (step.status === 'active') {
            step.status = 'error';
          } else if (step.status === 'pending' && index > 0) {
            step.status = 'pending';
          }
        });
        }
        break;
    }

    return baseSteps;
  }, []);

  // Check if deployment is active (in progress)
  const isDeploymentActive = useCallback((status: DeploymentStatus): boolean => {
    return status === DeploymentStatus.PENDING ||
           status === DeploymentStatus.DUMPING ||
           status === DeploymentStatus.DEPLOYING;
  }, []);

  // Fetch deployment data (only load logs when deployment is active)
  const fetchDeployment = useCallback(async () => {
    if (!deploymentId) return;

    try {
      // Always fetch deployment status first (without logs) to check if we need logs
      const data = await deploymentApi.getById(deploymentId);
      
      // Check if deployment is active
      const wasActive = deployment && isDeploymentActive(deployment.status);
      const isNowActive = isDeploymentActive(data.status);
      
      // Only fetch logs if deployment is active AND (just became active OR we need to update logs)
      if (isNowActive) {
        // Fetch logs only when deployment is active
        // We fetch logs every time for active deployments to get latest updates
        try {
          const fetchedLogs = await deploymentApi.getLogs(deploymentId);
          if (fetchedLogs && Array.isArray(fetchedLogs)) {
            setLogs(prev => {
              const existingIds = new Set(prev.map(l => l.timestamp + l.message));
              const newLogs = fetchedLogs
                .map((log: any) => ({
                  message: log.message || '',
                  level: log.log_level || 'info',
                  phase: log.phase || '',
                  timestamp: log.created_at || new Date().toISOString()
                }))
                .filter((log: any) => !existingIds.has(log.timestamp + log.message));
              
              if (newLogs.length > 0) {
                return [...prev, ...newLogs].sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              }
              return prev;
            });
          }
        } catch (logError) {
          // Silently fail - logs are not critical
          console.error('Failed to fetch logs:', logError);
        }
      }

      // Clear logs if deployment status changed from active to completed/failed
      if (wasActive && !isNowActive) {
        // Deployment just completed/failed, clear logs
        setLogs([]);
      }

      // Stop polling and clear logs when deployment completes/fails FIRST
      // IMPORTANT: Check this BEFORE setting deployment state to prevent any further processing
      if (data.status === DeploymentStatus.SUCCESS || data.status === DeploymentStatus.FAILED) {
        setDeployment(data);
        setSteps(getStepsFromStatus(data.status, data));
        setLogs([]);
        setIsPolling(false);
        
        if (data.status === DeploymentStatus.SUCCESS) {
          onComplete?.(data);
        } else {
          onError?.(getErrorMessage(data) || 'Deployment failed');
        }
        
        // Return early to prevent any further processing
        return;
      }

      setDeployment(data);
      setSteps(getStepsFromStatus(data.status, data));

      // Only start/continue polling if deployment is active
      if (isDeploymentActive(data.status)) {
        // Start polling if not already polling
        if (!isPolling) {
          setIsPolling(true);
        }
      } else {
        // Stop polling if deployment is not active
        setIsPolling(false);
      }

      // Only process fallback logs if deployment is active
      if (isDeploymentActive(data.status)) {
        const deploymentLogs = getLogs(data);
        if (deploymentLogs && Array.isArray(deploymentLogs) && deploymentLogs.length > 0) {
          setLogs(prev => {
            const existingMessages = new Set(prev.map(l => l.message));
            const newLogs = deploymentLogs
              .filter((log: string) => !existingMessages.has(log))
              .map((log: string) => ({
                message: log,
                level: 'info',
                phase: '',
                timestamp: new Date().toISOString()
              }));
            
            if (newLogs.length > 0) {
              return [...prev, ...newLogs].sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
      }
            return prev;
          });
        }
      }

      // This check is now handled at the beginning of the function
    } catch (error: any) {
      console.error('Failed to fetch deployment:', error);
      // Continue polling on error
    }
  }, [deploymentId, getStepsFromStatus, onComplete, onError, isDeploymentActive, deployment]);

  // Initial fetch on mount - check deployment status first
  useEffect(() => {
    if (!deploymentId) return;
    
    // Fetch once to check status
    const checkStatus = async () => {
      try {
        const data = await deploymentApi.getById(deploymentId);
        setDeployment(data);
        setSteps(getStepsFromStatus(data.status, data));
        
        // Only start polling if deployment is active
        if (isDeploymentActive(data.status)) {
          setIsPolling(true);
        } else {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Failed to fetch deployment status:', error);
      }
    };
    
    checkStatus();
  }, [deploymentId, getStepsFromStatus, isDeploymentActive]);

  // Polling effect - optimized intervals based on deployment status
  useEffect(() => {
    if (!isPolling || !deploymentId) return;

    // Determine polling interval based on deployment status
    const getPollingInterval = () => {
      if (!deployment) return 15000; // Default 15s when loading
      
      // Active deployments: poll less frequently to reduce load
      if (deployment.status === DeploymentStatus.PENDING ||
          deployment.status === DeploymentStatus.DUMPING ||
          deployment.status === DeploymentStatus.DEPLOYING) {
        return 15000; // 15 seconds for active deployments (reduced frequency)
      }
      
      // Completed/failed: stop polling completely
      return 0;
    };

    const interval = getPollingInterval();
    if (interval === 0) {
      // Stop polling if completed/failed
      setIsPolling(false);
      return;
    }

    let pollInterval: NodeJS.Timeout | null = null;
    
    const poll = () => {
      // Check deployment status before each poll
      if (deployment && !isDeploymentActive(deployment.status)) {
        setIsPolling(false);
        if (pollInterval) clearInterval(pollInterval);
        return;
      }
    fetchDeployment();
    };

    pollInterval = setInterval(poll, interval);

    return () => clearInterval(pollInterval);
  }, [isPolling, fetchDeployment, deploymentId, deployment, isDeploymentActive]);

  // Elapsed time tracker
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPolling, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    return (completedSteps / steps.length) * 100;
  };

  const getStatusIcon = (status: DeploymentStep['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <svg className="animate-spin w-5 h-5 text-blue-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>
        );
    }
  };

  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case DeploymentStatus.SUCCESS:
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case DeploymentStatus.FAILED:
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case DeploymentStatus.DEPLOYING:
      case DeploymentStatus.DUMPING:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  if (!deployment) {
    return (
      <div className={`bg-[#111620] border border-slate-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin w-8 h-8 text-blue-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#111620] border border-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-200 font-mono">Deployment Progress</h3>
          <p className="text-sm text-slate-500 font-mono mt-1">
            {deployment.devnetProgramId ? (
              <>
                Program: {deployment.devnetProgramId.slice(0, 8)}...{deployment.devnetProgramId.slice(-6)}
              </>
            ) : (
              'Initializing deployment...'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-md border font-mono text-sm ${getStatusColor(deployment.status)}`}>
            {deployment.status}
          </div>
          {isPolling && (
            <div className="text-slate-400 font-mono text-sm">
              {formatTime(elapsedTime)}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-slate-900/30">
        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-500 font-mono">
            {steps.filter(s => s.status === 'completed').length} of {steps.length} steps
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {getProgressPercentage().toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 py-4 space-y-1">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
              step.status === 'active' ? 'bg-blue-500/5 border border-blue-500/20' : ''
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`font-medium font-mono text-sm ${
                  step.status === 'completed' ? 'text-slate-300' :
                  step.status === 'active' ? 'text-blue-300' :
                  step.status === 'error' ? 'text-red-300' :
                  'text-slate-500'
                }`}>
                  {step.label}
                </h4>
                {step.status === 'active' && (
                  <span className="text-xs text-blue-400 font-mono animate-pulse">In Progress...</span>
                )}
              </div>
              <p className={`text-xs font-mono mt-1 ${
                step.status === 'error' ? 'text-red-400' : 'text-slate-500'
              }`}>
                {step.status === 'error' && getErrorMessage(deployment)
                  ? getErrorMessage(deployment)
                  : step.description}
              </p>
              {step.status === 'completed' && step.timestamp && (
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  Completed at {new Date(step.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Logs Section - Only show when deployment is active (in progress) */}
      {deployment && isDeploymentActive(deployment.status) && logs.length > 0 && (
        <div className="border-t border-slate-800">
          <div className="px-6 py-3 bg-slate-900/30 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-300 font-mono">Deployment Logs</h4>
            <span className="text-xs text-slate-500 font-mono">
              {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <div className="px-6 py-4 max-h-80 overflow-y-auto bg-[#0B0E14] font-mono text-xs">
            {logs.length > 0 ? (
              logs.map((log, index) => {
                const logTime = new Date(log.timestamp).toLocaleTimeString();
                const getLogColor = () => {
                  if (log.level === 'error') return 'text-red-400';
                  if (log.level === 'warn') return 'text-yellow-400';
                  if (log.message.includes('✅') || log.message.includes('success')) return 'text-green-400';
                  if (log.message.includes('❌') || log.message.includes('failed')) return 'text-red-400';
                  return 'text-slate-400';
                };
                
                return (
                  <div key={index} className={`mb-2 leading-relaxed ${getLogColor()}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-600 flex-shrink-0">[{index + 1}]</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {log.phase && (
                            <span className="text-slate-600 text-[10px] uppercase">{log.phase}</span>
                          )}
                          <span className="text-slate-600 text-[10px]">{logTime}</span>
                          {log.level && log.level !== 'info' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                              log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {log.level}
                            </span>
                          )}
                        </div>
                        <div className="break-words">{log.message}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 text-center py-4">
                No logs available yet. Logs will appear here as deployment progresses.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success State with Actions */}
      {deployment.status === DeploymentStatus.SUCCESS && getDeployedProgramId(deployment) && (
        <div className="px-6 py-4 bg-green-500/5 border-t border-green-500/20">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-300 font-mono">Deployment Successful!</h4>
              <p className="text-xs text-green-400/70 font-mono mt-0.5">
                Program deployed to mainnet in {formatTime(elapsedTime)}
              </p>
              {getDeployedProgramId(deployment) && (
                <p className="text-xs text-green-400/60 font-mono mt-1">
                  Program ID: {getDeployedProgramId(deployment)?.slice(0, 8)}...{getDeployedProgramId(deployment)?.slice(-6)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={`https://explorer.solana.com/address/${getDeployedProgramId(deployment)}?cluster=mainnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 rounded-md text-sm font-mono transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Program on Explorer
            </a>
            {(deployment.on_chain_deploy_tx || deployment.on_chain_confirm_tx) && (
              <div className="flex gap-2">
                {deployment.on_chain_deploy_tx && (
                  <a
                    href={`https://explorer.solana.com/tx/${deployment.on_chain_deploy_tx}?cluster=mainnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-1.5 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 text-green-400 rounded text-xs font-mono transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Deploy TX
                  </a>
                )}
                {deployment.on_chain_confirm_tx && (
                  <a
                    href={`https://explorer.solana.com/tx/${deployment.on_chain_confirm_tx}?cluster=mainnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-1.5 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 text-green-400 rounded text-xs font-mono transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Confirm TX
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State with Detailed Info */}
      {deployment.status === DeploymentStatus.FAILED && (
        <div className="px-6 py-4 bg-red-500/5 border-t border-red-500/20">
          <div className="flex items-start gap-3 mb-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-300 font-mono">Deployment Failed</h4>
              <p className="text-xs text-red-400/70 font-mono mt-1 leading-relaxed">
                {getErrorMessage(deployment) || 'An error occurred during deployment. Please check the logs for details.'}
              </p>
              
              {/* Admin Mismatch Error Details */}
              {isAdminMismatchError(getErrorMessage(deployment)) && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <div className="flex items-start gap-2 mb-2">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h5 className="text-xs font-semibold text-red-300 font-mono">Admin Mismatch Error</h5>
                  </div>
                  <div className="text-xs text-red-400/80 font-mono space-y-1.5 leading-relaxed">
                    <p className="text-red-300/90 font-semibold mb-2">The backend admin wallet does not match the treasury pool admin.</p>
                    {(() => {
                      const adminInfo = extractAdminInfo(getErrorMessage(deployment));
                      return (
                        <div className="space-y-1">
                          {adminInfo.treasuryAdmin && (
                            <p>
                              <span className="text-slate-500">Treasury Pool Admin:</span>{' '}
                              <span className="text-red-300 font-mono">{adminInfo.treasuryAdmin}</span>
                            </p>
                          )}
                          {adminInfo.backendAdmin && (
                            <p>
                              <span className="text-slate-500">Backend Admin:</span>{' '}
                              <span className="text-red-300 font-mono">{adminInfo.backendAdmin}</span>
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    <div className="mt-3 pt-2 border-t border-red-500/20">
                        <p className="text-red-300/90 font-semibold mb-1">How to fix:</p>
                        <ol className="list-decimal list-inside space-y-1 text-red-400/70">
                          <li>Update <code className="bg-red-500/20 px-1 rounded">ADMIN_WALLET_PATH</code> in backend <code className="bg-red-500/20 px-1 rounded">.env</code> to match the treasury pool admin wallet</li>
                          <li>Restart the backend service</li>
                          <li>Retry the deployment</li>
                        </ol>
                      </div>
                  </div>
                </div>
              )}

              {/* Transaction Links */}
              {(deployment.transactionSignature || deployment.on_chain_deploy_tx) && (
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  <p className="text-xs text-slate-500 font-mono mb-2">Transaction Details:</p>
                  <div className="space-y-1">
                    {deployment.transactionSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.transactionSignature}?cluster=mainnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 font-mono underline flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Transaction
                      </a>
                    )}
                    {deployment.on_chain_deploy_tx && (
                      <a
                        href={`https://explorer.solana.com/tx/${deployment.on_chain_deploy_tx}?cluster=mainnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 font-mono underline flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Deploy Transaction
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}