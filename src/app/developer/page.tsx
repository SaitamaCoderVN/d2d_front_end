'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import DeploymentForm from '@/components/DeploymentForm';
import DeploymentProgress from '@/components/DeploymentProgress';
import { deploymentApi } from '@/lib/api';
import { Deployment, DeploymentStatus } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

export default function DeveloperPage() {
  const { publicKey, connected } = useWallet();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [activeDeployment, setActiveDeployment] = useState<Deployment | null>(null);
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use ref to track interval and prevent multiple intervals
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Fetch latest deployment (active or most recent)
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;

      if (!connected || !publicKey) {
        setActiveDeployment(null);
        return;
      }

    const fetchLatestDeployment = async () => {
      try {
        setIsLoadingDeployments(true);
        const deployments = await deploymentApi.getByUser(publicKey.toString());

        // Find first active deployment, or most recent one
        const active = deployments.find((d: Deployment) =>
          d.status === DeploymentStatus.PENDING ||
          d.status === DeploymentStatus.DUMPING ||
          d.status === DeploymentStatus.DEPLOYING
        );

        // If no active deployment, get the most recent one (success or failed)
        const latest = active || deployments.sort((a: Deployment, b: Deployment) => {
          const aTime = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime();
          const bTime = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime();
          return bTime - aTime;
        })[0] || null;

        setActiveDeployment((prev) => {
          // Only update if deployment actually changed to prevent unnecessary re-renders
          if (prev?.id === latest?.id && prev?.status === latest?.status) {
            return prev;
          }
          return latest;
        });

        // Check if there's an active deployment AFTER fetching
        const hasActiveDeployment = latest && (
          latest.status === DeploymentStatus.PENDING ||
          latest.status === DeploymentStatus.DUMPING ||
          latest.status === DeploymentStatus.DEPLOYING
        );

        // Set up polling based on current deployment status
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        if (hasActiveDeployment) {
          // Active deployment exists - poll every 30 seconds
          if (!isPollingRef.current) {
            isPollingRef.current = true;
            intervalRef.current = setInterval(() => {
              fetchLatestDeployment();
            }, 30000); // 30 seconds for active deployment
          }
        } else {
          // No active deployment - poll very rarely (every 120 seconds)
          isPollingRef.current = false;
          intervalRef.current = setInterval(() => {
            fetchLatestDeployment();
          }, 120000); // 120 seconds (2 minutes) when no active deployment
        }
      } catch (error) {
        console.error('Failed to fetch deployments:', error);
      } finally {
        setIsLoadingDeployments(false);
      }
    };

    // Initial fetch
    fetchLatestDeployment();

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [connected, publicKey, refreshTrigger]); // Removed activeDeployment from dependencies

  const handleDeploymentCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDeploymentComplete = () => {
    setActiveDeployment(null);
    setRefreshTrigger((prev) => prev + 1);
    toast.success('Deployment completed! View your program in the Programs page.');
  };

  const handleDeploymentError = () => {
    setActiveDeployment(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  const stats = [
    {
      label: 'Service Fee',
      value: '$5',
      subtitle: '≈ 0.025 SOL',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      label: 'Rent Covered',
      value: '~1.2 SOL',
      subtitle: 'By backer pool',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      label: 'Program Size',
      value: '~86 KB',
      subtitle: '172,414 bytes',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
          <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
          <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
        </svg>
      )
    },
    {
      label: 'Deploy Time',
      value: '~15s',
      subtitle: 'Average time',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      label: 'You Save',
      value: '~1.175 SOL',
      subtitle: 'vs manual deploy',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col">
      <main className="flex-1 w-full max-w-[1920px] mx-auto">
        {/* Page Title Block Removed as it's now in Header */}

        {!connected ? (
          <div className="flex-1 flex items-center justify-center">
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
                // Connect wallet in the header to initialize developer console session.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-8">
            {/* 1. HUD METRICS: Stats Overview (Horizontal Strip) - MOVED TO TOP */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
              {stats.map((stat, index) => (
                <div key={index} className="bg-[#111620] p-4 rounded border border-slate-800/60 hover:border-blue-500/30 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{stat.label}</span>
                    <div className="text-blue-500/50 group-hover:text-blue-500 transition-colors scale-75 origin-right">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-slate-200 font-mono">{stat.value}</div>
                  <div className="text-[10px] text-slate-600 font-mono">{stat.subtitle}</div>
                </div>
              ))}
            </div>

            {/* 2. ACTION CENTER: Deployment Form (Hero Input) */}
            <div className="w-full">
              <DeploymentForm onDeploymentCreated={handleDeploymentCreated} />
            </div>

            {/* 3. DEPLOYMENT PROGRESS: Always show (replaces ACTIVE_STAKE component) */}
              <div className="w-full">
                <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-200 font-mono">
                  {activeDeployment ? 'Deployment Status' : 'No Active Deployment'}
                </h2>
                  <Link
                    href="/developer/programs"
                    className="text-sm text-slate-400 hover:text-blue-400 font-mono transition-colors"
                  >
                    View All Programs →
                  </Link>
                </div>
              {activeDeployment ? (
                <DeploymentProgress
                  deploymentId={activeDeployment._id || activeDeployment.id || ''}
                  onComplete={handleDeploymentComplete}
                  onError={handleDeploymentError}
                />
              ) : !isLoadingDeployments ? (
                <div className="bg-[#111620] border border-slate-800 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-mono text-sm mb-2">No deployment in progress</p>
                  <p className="text-slate-500 font-mono text-xs">Deploy a program above to see progress here</p>
                </div>
              ) : (
                <div className="bg-[#111620] border border-slate-800 rounded-lg p-8">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin w-6 h-6 text-blue-400" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
              </div>
              </div>
            )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
