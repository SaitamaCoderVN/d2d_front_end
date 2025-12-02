'use client';

import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletWithPoints from '@/components/WalletWithPoints';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { connected } = useWallet();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="header-sticky">
        <div className="container-main">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition">
                <Image src="/favicon.svg" alt="D2D" width={32} height={32} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Decentralize Deployment</h1>
                <p className="text-xs text-gray-500">Solana Program Deployment</p>
              </div>
            </Link>
            <WalletWithPoints />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="space-section bg-gradient-to-b from-blue-50 to-white">
        <div className="container-main">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 badge badge-blue mb-8">
              <div className="w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" />
              <span>Live on Solana Devnet</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-display text-gray-900 mb-6">
              Deploy Solana Programs<br />
              <span className="text-[#0066FF]">For Just $5</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-body-large max-w-2xl mx-auto mb-12">
              No need to manage rent, keypairs, or complex CLI commands. 
              Deploy your Solana programs to devnet with one click.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-12 mb-16 text-center">
              <div>
                <div className="text-5xl font-bold text-gray-900 mb-2">$5</div>
                <div className="text-sm text-gray-600">Service Fee</div>
              </div>
              <div className="w-px h-16 bg-gray-200" />
              <div>
                <div className="text-5xl font-bold text-[#0066FF] mb-2">~1.2 SOL</div>
                <div className="text-sm text-gray-600">Rent Covered</div>
              </div>
              <div className="w-px h-16 bg-gray-200" />
              <div>
                <div className="text-5xl font-bold text-gray-900 mb-2">12.19%</div>
                <div className="text-sm text-gray-600">APY for Backers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="space-section">
        <div className="container-main">
          <div className="grid-cards max-w-5xl mx-auto">
            {/* Developer Card */}
            <div className="card-interactive p-8">
              <div className="w-16 h-16 bg-[#0066FF] rounded-xl flex items-center justify-center mb-6 shadow-blue">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              
              <h3 className="text-heading-3 text-gray-900 mb-4">I'm a Developer</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Deploy your Solana programs to devnet instantly. 
                We handle all the rent and complexity for just $5.
              </p>
              
              <ul className="space-y-4 mb-10">
                {[
                  'One-click deployment',
                  '~1.2 SOL rent covered by backer pool',
                  'No keypair management needed',
                  'Deploy in under 15 seconds'
                ].map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => router.push('/developer')}
                disabled={!connected}
                className={connected ? 'btn-primary w-full' : 'btn-secondary w-full cursor-not-allowed opacity-50'}
              >
                {connected ? 'Deploy Now →' : 'Connect Wallet First'}
              </button>
            </div>

            {/* Backer Card */}
            <div className="card-interactive p-8">
              <div className="w-16 h-16 bg-[#0066FF] rounded-xl flex items-center justify-center mb-6 shadow-blue">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h3 className="text-heading-3 text-gray-900 mb-4">I'm a Backer</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Stake your SOL in our backer pool to support deployments 
                and earn passive income with attractive APY.
              </p>
              
              <ul className="space-y-4 mb-10">
                {[
                  'Earn up to 12.19% APY',
                  'Flexible staking periods',
                  'Unstake anytime (with cooldown)',
                  'Auto-compounding rewards'
                ].map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => router.push('/backer')}
                disabled={!connected}
                className={connected ? 'btn-primary w-full' : 'btn-secondary w-full cursor-not-allowed opacity-50'}
              >
                {connected ? 'Start Earning →' : 'Connect Wallet First'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-section bg-gray-50">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-heading-2 text-gray-900 mb-4">How It Works</h2>
            <p className="text-body-large">Simple, fast, and transparent</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Connect Wallet',
                description: 'Connect your Solana wallet using any supported wallet adapter',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              },
              {
                step: '2',
                title: 'Choose Role',
                description: 'Select Developer to deploy or Backer to earn passive income',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                step: '3',
                title: 'Start Now',
                description: 'Deploy programs or stake SOL with just a few clicks',
                icon: (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-[#0066FF] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-blue">
                  {item.icon}
                </div>
                <div className="text-5xl font-bold text-[#0066FF] mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container-main py-12">
          <div className="text-center">
            <p className="text-gray-600 mb-2">© 2025 Decentralize Deployment. Built on Solana.</p>
            <p className="text-sm text-gray-500">Making blockchain deployment accessible to everyone.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
