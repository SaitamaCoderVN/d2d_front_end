'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { deploymentApi, closeProgramApi } from '@/lib/api';
import { Deployment, DeploymentStatus } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ProgramsPage() {
  const { publicKey, connected } = useWallet();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingDeploymentId, setClosingDeploymentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (connected && publicKey) {
      fetchDeployments();
    } else {
      setIsLoading(false);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) return;
    
    const hasActiveDeployment = deployments.some(
      (d) =>
        d.status === DeploymentStatus.PENDING ||
        d.status === DeploymentStatus.DUMPING ||
        d.status === DeploymentStatus.DEPLOYING,
    );

    if (!hasActiveDeployment) return;

    const interval = setInterval(() => {
      fetchDeployments();
    }, 3000);

    return () => clearInterval(interval);
  }, [deployments, connected, publicKey]);

  const fetchDeployments = async () => {
    if (!publicKey) return;
    try {
      const data = await deploymentApi.getByUser(publicKey.toString());
      setDeployments(data);
    } catch (error: any) {
      console.error('Failed to fetch deployments:', error);
      if (error.code !== 'ERR_NETWORK') {
        toast.error('Failed to load programs');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseProgram = async (deploymentId: string) => {
    if (!deploymentId || deploymentId === '' || !publicKey) {
      toast.error('Deployment ID is required');
      return;
    }

    if (!confirm('Are you sure you want to close this program? All SOL will be returned to the treasury pool.')) {
      return;
    }

    setClosingDeploymentId(deploymentId);
    
    try {
      const result = await closeProgramApi.closeProgram(deploymentId, publicKey.toString());
      
      toast.success(
        <div>
          <div className="font-semibold mb-1">✅ Program Closed Successfully!</div>
          <div className="text-sm">
            Recovered {result.recoveredLamports / 1e9} SOL
          </div>
        </div>,
        { duration: 6000 }
      );

      await fetchDeployments();
    } catch (error: any) {
      console.error('Failed to close program:', error);
      
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

  const getStatusConfig = (status: DeploymentStatus) => {
    const configs = {
      [DeploymentStatus.PENDING]: { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/10' },
      [DeploymentStatus.DUMPING]: { label: 'Dumping', color: 'text-purple-400', bg: 'bg-purple-500/10' },
      [DeploymentStatus.DEPLOYING]: { label: 'Deploying', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      [DeploymentStatus.SUCCESS]: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/10' },
      [DeploymentStatus.FAILED]: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10' },
      [DeploymentStatus.CLOSED]: { label: 'Closed', color: 'text-slate-500', bg: 'bg-slate-500/10' }
    };
    return configs[status] || configs[DeploymentStatus.PENDING];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredDeployments = deployments.filter((deployment) => {
    const query = searchQuery.toLowerCase();
    const programId = (deployment.devnetProgramId || deployment.devnet_program_id || '').toLowerCase();
    const status = getStatusConfig(deployment.status).label.toLowerCase();
    return programId.includes(query) || status.includes(query);
  });

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="text-center py-32">
          <div className="w-24 h-24 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-900/20 border border-slate-700">
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-200 mb-6 font-mono">
            ACCESS_DENIED
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8 font-mono text-sm">
            // Connect wallet in the header to view your programs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search Programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 font-mono text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {/* View Toggle Buttons */}
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Projects Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-200 font-mono">Programs</h1>
        </div>

        {/* Programs List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-900/50 rounded-md animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : filteredDeployments.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-lg">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 font-mono text-sm">
              {searchQuery ? 'No programs found matching your search.' : 'No programs found. Deploy your first program from the Deployment page.'}
            </p>
            {!searchQuery && (
              <Link href="/developer" className="mt-4 inline-block text-blue-400 hover:text-blue-300 font-mono text-sm">
                Go to Deployment →
              </Link>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-1 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30">
            {filteredDeployments.map((deployment) => {
              const statusConfig = getStatusConfig(deployment.status);
              const programId = deployment.devnetProgramId || deployment.devnet_program_id;
              const isActive = [DeploymentStatus.PENDING, DeploymentStatus.DUMPING, DeploymentStatus.DEPLOYING].includes(deployment.status);
              const createdAt = deployment.createdAt || deployment.created_at || new Date().toISOString();
              
              return (
                <div
                  key={deployment._id || deployment.id}
                  className="flex items-center justify-between p-4 border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30 transition-colors group"
                >
                  {/* Left: Icon, Name, URL */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                      <span className="text-blue-400 font-mono font-bold text-xs">D2D</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-200 font-mono truncate">
                          {programId ? `${programId.slice(0, 12)}...${programId.slice(-8)}` : 'Program'}
                        </h3>
                      </div>
                      {programId && (
                        <a
                          href={`https://explorer.solana.com/address/${programId}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-500 hover:text-blue-400 font-mono truncate block"
                        >
                          explorer.solana.com/address/{programId.slice(0, 8)}...
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Middle: Status, Date */}
                  <div className="flex items-center gap-4 flex-1 min-w-0 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${statusConfig.bg} ${statusConfig.color} whitespace-nowrap`}>
                      {statusConfig.label}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-slate-400 font-mono truncate">
                        Deployed {formatDate(createdAt)}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        on devnet
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isActive && (
                      <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
                        <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                    {programId && (
                      <a
                        href={`https://explorer.solana.com/address/${programId}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
                        title="View on Explorer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    <button className="p-2 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeployments.map((deployment) => {
              const statusConfig = getStatusConfig(deployment.status);
              const programId = deployment.devnetProgramId || deployment.devnet_program_id;
              const isActive = [DeploymentStatus.PENDING, DeploymentStatus.DUMPING, DeploymentStatus.DEPLOYING].includes(deployment.status);
              const createdAt = deployment.createdAt || deployment.created_at || new Date().toISOString();
              
              return (
                <div
                  key={deployment._id || deployment.id}
                  className="border border-slate-800 bg-slate-900/30 rounded-lg p-6 hover:border-blue-500/30 transition-all group"
                >
                  {/* Icon and Title Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                        <span className="text-blue-400 font-mono font-bold text-sm">D2D</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-200 font-mono truncate">
                          {programId ? `${programId.slice(0, 8)}...` : 'Program'}
                        </h3>
                        {programId && (
                          <a
                            href={`https://explorer.solana.com/address/${programId}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-500 hover:text-blue-400 font-mono truncate block"
                          >
                            explorer.solana.com
                          </a>
                        )}
                      </div>
                    </div>
                    <button className="p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Status and Date */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-mono ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatDate(createdAt)}
                    </span>
                  </div>

                  {/* Program Details */}
                  <div className="space-y-2 mb-4 text-xs font-mono">
                    {programId && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-slate-600">Program ID:</span>
                        <span className="text-slate-300 truncate">{programId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-slate-600">Deployed:</span>
                      <span className="text-slate-300">{formatFullDate(createdAt)}</span>
                    </div>
                    {(deployment.subscriptionExpiresAt || deployment.subscription_expires_at) && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-slate-600">Expires:</span>
                        <span className="text-slate-300">
                          {formatFullDate(deployment.subscriptionExpiresAt || deployment.subscription_expires_at || '')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
                          <svg className="animate-spin h-3 w-3 text-blue-400" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      )}
                      {programId && (
                        <a
                          href={`https://explorer.solana.com/address/${programId}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"
                          title="View on Explorer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    
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
                          <span>Close</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

