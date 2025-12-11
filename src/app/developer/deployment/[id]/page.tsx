'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import DeploymentProgress from '@/components/DeploymentProgress';
import Link from 'next/link';
import { Deployment } from '@/types';
import toast from 'react-hot-toast';

export default function DeploymentProgressPage() {
  const params = useParams();
  const router = useRouter();
  const { connected } = useWallet();
  const deploymentId = params.id as string;

  const handleComplete = (deployment: Deployment) => {
    toast.success(
      <div>
        <div className="font-semibold mb-1">🎉 Deployment Complete!</div>
        <div className="text-sm">
          Program successfully deployed to mainnet
        </div>
      </div>,
      { duration: 5000 }
    );
  };

  const handleError = (error: string) => {
    toast.error(
      <div>
        <div className="font-semibold mb-1">❌ Deployment Failed</div>
        <div className="text-sm">{error}</div>
      </div>,
      { duration: 8000 }
    );
  };

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
            // Connect wallet to view deployment progress
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/developer/programs"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 font-mono text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Programs
          </Link>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-200 font-mono mb-2">
            Deployment Status
          </h1>
          <p className="text-slate-400 font-mono text-sm">
            Track your program deployment in real-time
          </p>
        </div>

        {/* Deployment Progress Component */}
        <DeploymentProgress
          deploymentId={deploymentId}
          onComplete={handleComplete}
          onError={handleError}
          className="mb-6"
        />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href="/developer/programs"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-md font-mono text-sm transition-colors"
          >
            View All Programs
          </Link>
          <Link
            href="/developer"
            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-md font-mono text-sm transition-colors"
          >
            Deploy Another Program
          </Link>
        </div>

        {/* Help Card */}
        <div className="mt-8 bg-[#111620] border border-slate-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-200 font-mono mb-2">
                About Deployment Process
              </h3>
              <div className="text-xs text-slate-400 font-mono space-y-2 leading-relaxed">
                <p>
                  <span className="text-slate-500">1.</span> <strong className="text-slate-300">Verify:</strong> We check if your program exists on devnet
                </p>
                <p>
                  <span className="text-slate-500">2.</span> <strong className="text-slate-300">Dump:</strong> Extract the program binary from devnet
                </p>
                <p>
                  <span className="text-slate-500">3.</span> <strong className="text-slate-300">Fund:</strong> Fund a temporary wallet from the treasury pool
                </p>
                <p>
                  <span className="text-slate-500">4.</span> <strong className="text-slate-300">Deploy:</strong> Deploy your program to Solana mainnet
                </p>
                <p>
                  <span className="text-slate-500">5.</span> <strong className="text-slate-300">Confirm:</strong> Verify deployment and return unused funds
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 font-mono">
                  <strong className="text-slate-400">Note:</strong> The deployment typically takes 15-30 seconds.
                  If you encounter any issues, please contact support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}