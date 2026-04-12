import { useCallback, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { apiGet } from '../lib/api';
import { useWalletStore } from '../store/wallet';

export function useWalletData(options = {}) {
  const { autoRefresh = false } = options;
  const { authenticated, identityToken, syncReady, walletAddress, hasWallet } = useAuth();
  const setIdentity = useWalletStore((state) => state.setIdentity);
  const setPortfolio = useWalletStore((state) => state.setPortfolio);
  const setTransactions = useWalletStore((state) => state.setTransactions);
  const setLoading = useWalletStore((state) => state.setLoading);
  const setError = useWalletStore((state) => state.setError);

  useEffect(() => {
    setIdentity({ address: walletAddress, hasWallet });
  }, [hasWallet, setIdentity, walletAddress]);

  const refreshWallet = useCallback(async () => {
    if (!walletAddress) return null;
    setLoading(true);
    setError(null);

    try {
      const [portfolio, txData] = await Promise.all([
        apiGet(`/api/wallet/${walletAddress}/portfolio`, {
          token: identityToken ?? undefined,
        }),
        apiGet(`/api/wallet/${walletAddress}/transactions`, {
          token: identityToken ?? undefined,
        }),
      ]);

      const nextWarnings = [];

      setPortfolio({
        totalUsd: portfolio?.totalUsd ?? '$0.00',
        change24h: portfolio?.change24h ?? '+$0.00',
        tokens: portfolio?.tokens ?? [],
        nfts: portfolio?.nfts ?? [],
        chains: portfolio?.chains ?? [],
        lastUpdated: typeof portfolio?.lastUpdated === 'number' ? portfolio.lastUpdated : Date.now(),
      });

      setTransactions(Array.isArray(txData?.transactions) ? txData.transactions : []);

      if (Array.isArray(portfolio?.warnings) && portfolio.warnings.length) {
        nextWarnings.push(String(portfolio.warnings[0]));
      }
      if (Array.isArray(txData?.warnings) && txData.warnings.length) {
        nextWarnings.push(String(txData.warnings[0]));
      }

      if (nextWarnings.length) {
        setError(nextWarnings.join('. '));
      }

      return {
        portfolio,
        transactions: txData?.transactions ?? [],
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh wallet');
      return null;
    } finally {
      setLoading(false);
    }
  }, [identityToken, setError, setLoading, setPortfolio, setTransactions, walletAddress]);

  useEffect(() => {
    if (!autoRefresh || !authenticated || !syncReady || !walletAddress) return;
    void refreshWallet();
  }, [authenticated, autoRefresh, refreshWallet, syncReady, walletAddress]);

  return {
    refreshWallet,
  };
}
