'use client';

import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { pointsApi, PointsInfo } from '@/lib/api';

interface PointsDisplayProps {
  className?: string;
}

// Constants for point calculation
const POINTS_PER_SOL_PER_HOUR = 1;
const POINTS_PER_SOL_PER_SECOND = POINTS_PER_SOL_PER_HOUR / 3600;
const MIN_DEPOSIT_FOR_POINTS = 0.01; // 0.01 SOL minimum

export default function PointsDisplay({ className = '' }: PointsDisplayProps) {
  const { publicKey } = useWallet();
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
  const [displayPoints, setDisplayPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const lastSyncTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  const fetchPoints = async () => {
    if (!publicKey) {
      setIsLoading(false);
      setPointsInfo(null);
      setDisplayPoints(0);
      return;
    }

    setIsLoading(true);
    try {
      const data = await pointsApi.getPoints(publicKey.toString());
      setPointsInfo(data);
      setDisplayPoints(data.totalPoints);
      lastSyncTimeRef.current = Date.now();
    } catch (error: any) {
      console.error('Failed to fetch points:', error);
      setPointsInfo(null);
      setDisplayPoints(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time point calculation animation
  useEffect(() => {
    if (!pointsInfo || pointsInfo.currentDepositSOL < MIN_DEPOSIT_FOR_POINTS) {
      return;
    }

    const animate = () => {
      const now = Date.now();
      const elapsedSeconds = (now - lastSyncTimeRef.current) / 1000;
      
      // Calculate points earned since last sync
      const pointsPerSecond = pointsInfo.currentDepositSOL * POINTS_PER_SOL_PER_SECOND;
      const earnedPoints = elapsedSeconds * pointsPerSecond;
      
      // Update display points (base points + earned since sync)
      setDisplayPoints(pointsInfo.totalPoints + earnedPoints);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pointsInfo]);

  // Sync with backend every 30 seconds
  useEffect(() => {
    fetchPoints();
    const interval = setInterval(fetchPoints, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  if (!publicKey || isLoading) {
    return null;
  }

  if (!pointsInfo || pointsInfo.currentDepositSOL < MIN_DEPOSIT_FOR_POINTS) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md shadow-sm group hover:border-emerald-500/50 transition-colors">
        <svg
          className="w-3 h-3 text-emerald-500 animate-pulse"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-slate-300 font-mono text-xs tabular-nums group-hover:text-emerald-400 transition-colors">
          {displayPoints.toFixed(3)} XP
        </span>
      </div>
    </div>
  );
}

