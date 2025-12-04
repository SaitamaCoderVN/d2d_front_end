'use client';

import { useRouter } from 'next/navigation';
import { useUserMode } from '@/context/UserModeContext';

export default function Home() {
  const router = useRouter();
  const { setMode } = useUserMode();

  const handleDeveloperClick = () => {
    setMode('developer');
    router.push('/developer');
  };

  const handleBackerClick = () => {
    setMode('backer');
    router.push('/backer');
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-200 flex items-center justify-center relative overflow-hidden">
      {/* Blurred Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-purple-500/20 rounded-full blur-[150px] opacity-50"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-blue-500/20 rounded-full blur-[150px] opacity-50"></div>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full px-8 relative z-10">
        
        {/* Developer Card */}
        <div 
          onClick={handleDeveloperClick}
          className="group relative bg-[#151b28]/80 backdrop-blur-md border border-slate-700 hover:border-blue-500 rounded-3xl p-16 cursor-pointer transition-all duration-500 hover:shadow-[0_0_60px_rgba(59, 130, 246,0.3)] hover:-translate-y-4 hover:scale-105 flex flex-col items-center justify-center aspect-square"
        >
          <div className="w-32 h-32 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-8 border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
            <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white font-mono group-hover:text-blue-400 transition-colors tracking-tight">
            DEVELOPER
          </h2>
          <p className="mt-4 text-slate-400 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
            Deploy Contracts & Manage Projects
          </p>
        </div>

        {/* Backer Card */}
        <div 
          onClick={handleBackerClick}
          className="group relative bg-[#151b28]/80 backdrop-blur-md border border-slate-700 hover:border-purple-500 rounded-3xl p-16 cursor-pointer transition-all duration-500 hover:shadow-[0_0_60px_rgba(168,85,247,0.3)] hover:-translate-y-4 hover:scale-105 flex flex-col items-center justify-center aspect-square"
        >
          <div className="w-32 h-32 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-8 border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
            <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white font-mono group-hover:text-purple-400 transition-colors tracking-tight">
            BACKER
          </h2>
          <p className="mt-4 text-slate-400 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
            Provide Liquidity & Earn Rewards
          </p>
        </div>

      </div>
    </div>
  );
}
