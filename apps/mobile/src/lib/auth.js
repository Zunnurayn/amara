import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PrivyProvider,
  useEmbeddedWallet,
  usePrivy,
  isConnected,
  isNotCreated,
  chainDefs,
} from '@privy-io/expo';
import { MOBILE_CONFIG } from './config';
import { apiPost } from './api';
import { resolveWalletIdentity } from './wallet';

const AuthContext = createContext(null);
const BSC_CHAIN = {
  id: 56,
  name: 'BNB Chain',
  network: 'bsc',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.binance.org'] },
    public: { http: ['https://bsc-dataseed.binance.org'] },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://bscscan.com',
    },
  },
};

export function AuthProvider({ children }) {
  if (!MOBILE_CONFIG.privyAppId) {
    return (
      <AuthContext.Provider
        value={{
          ready: true,
          authenticated: false,
          syncReady: false,
          user: null,
          identityToken: null,
          walletAddress: null,
          hasWallet: false,
          walletStatus: 'missing-config',
          configError: 'Missing EXPO_PUBLIC_PRIVY_APP_ID.',
          logout: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={MOBILE_CONFIG.privyAppId}
      supportedChains={[chainDefs.base, chainDefs.mainnet, BSC_CHAIN]}
    >
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </PrivyProvider>
  );
}

function AuthSessionProvider({ children }) {
  const { user, isReady, logout, getAccessToken } = usePrivy();
  const embeddedWallet = useEmbeddedWallet();
  const [identityToken, setIdentityToken] = useState(null);
  const [syncReady, setSyncReady] = useState(false);
  const lastSyncedRef = useRef(null);
  const creatingWalletRef = useRef(false);
  const walletIdentity = resolveWalletIdentity(user);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setIdentityToken(null);
      setSyncReady(false);
      lastSyncedRef.current = null;
      return;
    }

    let cancelled = false;

    async function loadAccessToken() {
      try {
        const token = await getAccessToken();
        if (!cancelled) {
          setIdentityToken(token ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setIdentityToken(null);
          console.error('[mobile auth token]', error);
        }
      }
    }

    void loadAccessToken();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, isReady, user]);

  useEffect(() => {
    if (!isReady || !user || creatingWalletRef.current) return;
    if (!isNotCreated(embeddedWallet)) return;

    let cancelled = false;

    async function createEmbeddedWallet() {
      creatingWalletRef.current = true;
      try {
        await embeddedWallet.create();
      } catch (error) {
        if (!cancelled) {
          console.error('[mobile embedded wallet create]', error);
        }
      } finally {
        creatingWalletRef.current = false;
      }
    }

    void createEmbeddedWallet();
    return () => {
      cancelled = true;
    };
  }, [embeddedWallet, isReady, user]);

  useEffect(() => {
    if (!isReady || !user || !identityToken) return;
    const syncKey = `${user.id}:${walletIdentity.address ?? 'no-wallet'}`;
    if (lastSyncedRef.current === syncKey) {
      setSyncReady(true);
      return;
    }

    let cancelled = false;
    setSyncReady(false);

    async function syncUser() {
      try {
        await apiPost('/api/auth/sync', {
          walletAddress: walletIdentity.address ?? undefined,
        }, {
          token: identityToken,
        });

        if (!cancelled) {
          lastSyncedRef.current = syncKey;
          setSyncReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          lastSyncedRef.current = null;
          setSyncReady(false);
          console.error('[mobile auth sync]', error);
        }
      }
    }

    void syncUser();
    return () => {
      cancelled = true;
    };
  }, [identityToken, isReady, user, walletIdentity.address]);

  const value = useMemo(() => ({
    ready: isReady,
    authenticated: Boolean(user),
    syncReady,
    user,
    identityToken,
    walletAddress: walletIdentity.address,
    hasWallet: walletIdentity.hasWallet,
    walletStatus: embeddedWallet.status,
    embeddedWallet,
    logout,
    isEmbeddedWalletConnected: isConnected(embeddedWallet),
  }), [
    embeddedWallet,
    identityToken,
    isReady,
    logout,
    syncReady,
    user,
    walletIdentity.address,
    walletIdentity.hasWallet,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
