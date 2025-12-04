'use client';

import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface UtilizationChartProps {
  data: Array<{ date: string; solUsed: number; deploymentCount: number }>;
  isLoading?: boolean;
}

export default function UtilizationChart({ data, isLoading }: UtilizationChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-[#151b28] rounded-lg border border-slate-800">
        <div className="text-slate-500 font-mono text-sm animate-pulse">
          LOADING_CHART_DATA...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-[#151b28] rounded-lg border border-slate-800">
        <div className="text-slate-500 font-mono text-sm">
          NO_DATA_AVAILABLE
        </div>
      </div>
    );
  }

  // Format date to be shorter (e.g., "10/24")
  const formattedData = data.map(item => ({
    ...item,
    shortDate: new Date(item.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    formattedSol: item.solUsed.toFixed(2)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B0E14] border border-slate-700 p-3 rounded shadow-xl">
          <p className="text-slate-300 font-mono text-xs mb-1">{label}</p>
          <p className="text-blue-400 font-mono font-bold text-sm">
            {payload[0].value} SOL
          </p>
          <p className="text-slate-500 font-mono text-xs mt-1">
            {payload[0].payload.deploymentCount} Deployments
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#151b28] p-4 rounded-lg border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-300 font-mono flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          POOL_UTILIZATION
        </h3>
        <div className="text-[10px] font-mono text-slate-500">LAST_30_DAYS</div>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{
              top: 5,
              right: 10,
              left: -20,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="shortDate" 
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="formattedSol" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

