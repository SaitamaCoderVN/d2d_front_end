'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <div className="flex min-h-screen bg-[#0B0E14]">
      {!isHomePage && <Sidebar />}
      <div className={`flex-1 ${!isHomePage ? 'md:ml-64' : ''} min-h-screen bg-[#0B0E14] transition-all duration-200 flex flex-col`}>
        {!isHomePage && <Header />}
        <main className={`flex-1 ${!isHomePage ? 'pt-16 md:pt-0' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

