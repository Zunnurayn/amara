import { useCallback } from 'react';
import { apiPost } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTransactionMonitor } from './useTransactionMonitor';

export function useExecuteAction() {
  const { identityToken, walletAddress } = useAuth();
  const { waitForTransaction } = useTransactionMonitor();

  const executeAction = useCallback(async ({
    actionCard,
    chainId = actionCard?.metadata?.fromChainId ?? 8453,
    submitTransaction,
  }) => {
    if (!identityToken) {
      throw new Error('Your wallet session is not ready yet.');
    }
    if (!walletAddress) {
      throw new Error('A connected wallet is required.');
    }
    if (typeof submitTransaction !== 'function') {
      throw new Error('A mobile wallet submit handler is required.');
    }

    const simulation = await apiPost('/api/tx/simulate', {
      walletAddress,
      chainId,
      actionCard,
    }, {
      token: identityToken,
    });

    if (!simulation?.willSucceed) {
      throw new Error(
        Array.isArray(simulation?.warnings) && simulation.warnings.length
          ? String(simulation.warnings[0])
          : 'This action is not executable right now.'
      );
    }

    const submission = await submitTransaction({
      actionCard,
      chainId,
      simulation,
      walletAddress,
    });

    const execution = await apiPost('/api/tx/execute', {
      walletAddress,
      chainId: submission.chainId ?? chainId,
      txHash: submission.txHash,
      explorerUrl: submission.explorerUrl,
      executionStatus: 'pending',
      actionCard,
    }, {
      token: identityToken,
    });

    const finalStatus = await waitForTransaction({
      chainId: submission.chainId ?? chainId,
      txHash: submission.txHash,
    });

    return {
      simulation,
      submission,
      execution,
      finalStatus,
    };
  }, [identityToken, waitForTransaction, walletAddress]);

  return {
    executeAction,
  };
}
