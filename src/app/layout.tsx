import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'D2D - Decentralize Deployment',
  description: 'Deploy your Solana programs to Devnet with ease',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[#0B0E14] text-slate-200 antialiased selection:bg-emerald-500/30`} suppressHydrationWarning>
        <WalletProvider>
          <div className="flex min-h-screen bg-[#0B0E14]">
            <Sidebar />
            <main className="flex-1 md:ml-64 min-h-screen bg-[#0B0E14] transition-all duration-200 flex flex-col">
              {children}
            </main>
          </div>
        </WalletProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '!bg-slate-900 !border !border-slate-800 !text-slate-200',
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid #1e293b',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}

