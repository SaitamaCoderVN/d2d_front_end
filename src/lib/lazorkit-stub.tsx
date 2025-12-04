/**
 * Stub for @lazorkit/wallet to prevent SSR errors
 * This file replaces @lazorkit/wallet during server-side rendering
 * to avoid localStorage access errors
 */

import React from 'react';

// Stub LazorkitProvider - returns children as-is
export const LazorkitProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
};

// Stub useWallet hook - returns safe defaults
export const useWallet = () => {
  return {
    connect: async () => {},
    disconnect: async () => {},
    isConnected: false,
    smartWalletPubkey: null,
    isLoading: false,
    isConnecting: false,
    error: null,
    signAndSendTransaction: async () => '',
    signTransaction: undefined,
  };
};

// Export other exports as empty objects/functions to prevent import errors
export default {
  LazorkitProvider,
  useWallet,
};

