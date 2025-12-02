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
    <div className="min-h-screen bg-[#0B0E14] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Header - Simplified for Landing - Handled by Layout/Sidebar now */}
      {/* Keeping Hero top padding to account for potential fixed headers or visual balance */}
      
      {/* Hero Section */}
      <section className="pt-12 pb-20 relative overflow-hidden md:pt-20">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none"></div>
        
        <div className="container-main relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">System Online: Devnet</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              Deploy Solana Programs<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Without The Rent Overhead
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 font-light">
              Skip the CLI complexity. We handle rent exemption (~1.2 SOL) via our liquidity pool.
              <span className="block mt-2 text-slate-500 font-mono text-sm">
                // One-click deployment. // Automated rent funding. // Instant verification.
              </span>
            </p>

            {/* Terminal-like Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-16">
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded backdrop-blur-sm">
                <div className="text-xs font-mono text-slate-500 mb-1">SERVICE_FEE</div>
                <div className="text-2xl font-bold text-white font-mono">$5.00</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded backdrop-blur-sm">
                <div className="text-xs font-mono text-slate-500 mb-1">RENT_COVERED</div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">~1.2 SOL</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded backdrop-blur-sm">
                <div className="text-xs font-mono text-slate-500 mb-1">BACKER_APY</div>
                <div className="text-2xl font-bold text-purple-400 font-mono">12.19%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-20 border-t border-slate-800/50 bg-slate-900/20">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Developer Card */}
            <div className="group relative bg-[#151b28] border border-slate-800 hover:border-emerald-500/50 rounded-lg p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                <svg className="w-32 h-32 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-500/10 rounded flex items-center justify-center mb-6 border border-emerald-500/20">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2 font-mono">I'm a Developer</h3>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                  Deploy programs instantly. Focus on code, not infrastructure costs.
                </p>
                
                <ul className="space-y-3 mb-8">
                  {[
                    'Zero rent upfront cost',
                    'Automated keypair management',
                    'Instant mainnet verification'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3 text-sm text-slate-300">
                      <span className="text-emerald-500 font-mono">>></span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => router.push('/developer')}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono rounded transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  <span>INITIALIZE_DEPLOYMENT</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Backer Card */}
            <div className="group relative bg-[#151b28] border border-slate-800 hover:border-purple-500/50 rounded-lg p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                <svg className="w-32 h-32 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-purple-500/10 rounded flex items-center justify-center mb-6 border border-purple-500/20">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2 font-mono">I'm a Backer</h3>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                  Provide liquidity for deployments. Earn high yield from service fees.
                </p>
                
                <ul className="space-y-3 mb-8">
                  {[
                    'Earn 12.19% APY (Variable)',
                    'Real-time reward distribution',
                    'Transparent on-chain metrics'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3 text-sm text-slate-300">
                      <span className="text-purple-500 font-mono">>></span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => router.push('/backer')}
                  className="w-full py-3 bg-slate-800 hover:bg-purple-600 text-white font-bold font-mono rounded transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-purple-500"
                >
                  <span>PROVIDE_LIQUIDITY</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0B0E14] py-12">
        <div className="container-main text-center">
          <p className="text-slate-500 font-mono text-sm mb-2">
            // SYSTEM STATUS: OPERATIONAL
          </p>
          <p className="text-slate-600 text-xs">
            © 2025 D2D Protocol. Running on Solana Devnet.
          </p>
        </div>
      </footer>
    </div>
  );
}
