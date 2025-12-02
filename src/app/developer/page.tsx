'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletWithPoints from '@/components/WalletWithPoints';
import DeploymentForm from '@/components/DeploymentForm';
import DeploymentHistory from '@/components/DeploymentHistory';
import UserStakeInfo from '@/components/UserStakeInfo';
import Link from 'next/link';
import Image from 'next/image';

export default function DeveloperPage() {
  const { publicKey, connected } = useWallet();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDeploymentCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header-sticky">
        <div className="container-main">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition">
                  <Image src="/favicon.svg" alt="D2D" width={32} height={32} />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Developer Dashboard</h1>
                  <p className="text-xs text-gray-500">Deploy programs to devnet</p>
                </div>
              </Link>
              
              {/* Navigation */}
              <nav className="hidden md:flex space-x-2">
                <Link 
                  href="/developer"
                  className="px-4 py-2 rounded-lg bg-[#0066FF] text-white font-medium text-sm"
                >
                  Deploy
                </Link>
                <Link 
                  href="/backer"
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition font-medium text-sm"
                >
                  Stake & Earn
                </Link>
                <Link
                  href="/leaderboard"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#0066FF] hover:bg-gray-100 rounded-lg transition"
                >
                  🏆 Leaderboard
                </Link>
              </nav>
            </div>
            <WalletWithPoints />
          </div>
        </div>
      </header>

      <main className="container-main py-12">
        {!connected ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 bg-[#0066FF] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-blue">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-heading-2 text-gray-900 mb-6">
              Connect Your Wallet
            </h2>
            <p className="text-body-large max-w-md mx-auto mb-8">
              Please connect your Solana wallet to start deploying programs to devnet.
            </p>
            <WalletWithPoints />
          </div>
        ) : (
          <div className="space-y-8">
            {/* User Stake & Rewards Info */}
            <UserStakeInfo />

            {/* Stats Overview */}
            <div className="grid-stats">
              {stats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="flex items-center justify-between mb-4">
                    <span className="stat-label">{stat.label}</span>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-[#0066FF]">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-subtitle">{stat.subtitle}</div>
                </div>
              ))}
            </div>

            {/* Deployment Form */}
            <DeploymentForm onDeploymentCreated={handleDeploymentCreated} />

            {/* Deployment History */}
            {publicKey && (
              <DeploymentHistory
                userWalletAddress={publicKey.toString()}
                refreshTrigger={refreshTrigger}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
