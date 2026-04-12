import { useCallback } from 'react';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';

export function useTransactionMonitor() {
  const { identityToken } = useAuth();

  const waitForTransaction = useCallback(async ({
    chainId,
    txHash,
    timeoutMs = 90_000,
    intervalMs = 3_000,
  }) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const result = await apiGet(`/api/tx/status/${chainId}/${txHash}`, {
        token: identityToken ?? undefined,
      });

      if (result?.status === 'confirmed' || result?.status === 'failed') {
        return result;
      }

      await delay(intervalMs);
    }

    throw new Error('Transaction confirmation timed out.');
  }, [identityToken]);

  return {
    waitForTransaction,
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
