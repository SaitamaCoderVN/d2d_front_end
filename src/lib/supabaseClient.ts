'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not set. Supabase features will be disabled.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// ============================================================================
// DEPLOYMENT QUERIES (for direct client-side access)
// ============================================================================

/**
 * Fetch deployments for a specific user wallet
 * Note: Most operations should go through the backend API for security
 * This is provided for read-only operations and real-time subscriptions
 */
export async function getDeploymentsByUser(walletAddress: string) {
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('user_wallet_address', walletAddress)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching deployments:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch a single deployment by ID
 */
export async function getDeploymentById(id: string) {
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching deployment:', error);
    return null;
  }

  return data;
}

/**
 * Subscribe to deployment updates in real-time
 * @param deploymentId - The deployment ID to subscribe to
 * @param callback - Function called when deployment updates
 */
export function subscribeToDeployment(
  deploymentId: string,
  callback: (deployment: any) => void
) {
  const channel = supabase
    .channel(`deployment-${deploymentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'deployments',
        filter: `id=eq.${deploymentId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to all deployments for a user
 */
export function subscribeToUserDeployments(
  walletAddress: string,
  callback: (deployment: any) => void
) {
  const channel = supabase
    .channel(`user-deployments-${walletAddress}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'deployments',
        filter: `user_wallet_address=eq.${walletAddress}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch deployment logs
 */
export async function getDeploymentLogs(deploymentId: string) {
  const { data, error } = await supabase
    .from('deployment_logs')
    .select('*')
    .eq('deployment_id', deploymentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching deployment logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Subscribe to deployment logs in real-time
 */
export function subscribeToDeploymentLogs(
  deploymentId: string,
  callback: (log: any) => void
) {
  const channel = supabase
    .channel(`deployment-logs-${deploymentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'deployment_logs',
        filter: `deployment_id=eq.${deploymentId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetch user stats
 */
export async function getUserStats(walletAddress: string) {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }

  return data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('deployments').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

