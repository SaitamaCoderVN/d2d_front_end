import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Base Dark Theme Colors
        obsidian: '#0B0E14', // Deepest background
        slate: {
          850: '#151b28', // Panel background
          900: '#0f172a',
          950: '#020617',
        },
        // Accent Colors
        emerald: {
          400: '#34d399', // Neon Green Text
          500: '#10b981', // Neon Green Border/Bg
          900: '#064e3b', // Deep Green Glow
        },
        // Solana Brand Colors
        solana: {
          purple: '#9945FF',
          green: '#14F195',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'solana-gradient': 'linear-gradient(to right, #9945FF, #14F195)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
