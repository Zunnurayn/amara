// App.jsx — Amara Wallet root

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SheetsProvider } from './src/hooks/useSheets';
import { AuthProvider, useAuth } from './src/lib/auth';
import { hasRequiredMobileConfig } from './src/lib/config';
import { useWalletData } from './src/hooks/useWalletData';
import AppNavigator  from './src/navigation/AppNavigator';
import AgentBrief    from './src/components/brief/AgentBrief';
import AuthGate      from './src/components/auth/AuthGate';

// ── All bottom sheets ──────────────────────────────
import SendSheet    from './src/components/send/SendSheet';
import ReceiveSheet from './src/components/receive/ReceiveSheet';
import SwapSheet    from './src/components/swap/SwapSheet';
import BridgeSheet  from './src/components/bridge/BridgeSheet';
import OnrampSheet  from './src/components/onramp/OnrampSheet';

import { Colors, Fonts, Spacing } from './src/constants/theme';

export default function App() {
  if (!hasRequiredMobileConfig()) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <View style={[styles.shell, styles.centered]}>
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Mobile Config Missing</Text>
              <Text style={styles.stateBody}>
                Set `EXPO_PUBLIC_PRIVY_APP_ID` before running the mobile client.
              </Text>
            </View>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <SheetsProvider>
            <BottomSheetModalProvider>
              <AppShell />
            </BottomSheetModalProvider>
          </SheetsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const [briefDone, setBriefDone] = useState(false);
  const { ready, authenticated, syncReady, hasWallet, walletStatus, logout } = useAuth();
  useWalletData({ autoRefresh: true });

  if (!ready) {
    return (
      <View style={[styles.shell, styles.centered]}>
        <StateCard title="Loading Session" body="Restoring your wallet session and local state." />
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View style={styles.shell}>
        <AuthGate />
      </View>
    );
  }

  if (!syncReady || walletStatus === 'creating' || walletStatus === 'connecting') {
    return (
      <View style={[styles.shell, styles.centered]}>
        <StateCard title="Preparing Wallet" body="Syncing your account and securing your embedded wallet." />
      </View>
    );
  }

  if (!hasWallet) {
    return (
      <View style={[styles.shell, styles.centered]}>
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Wallet Not Ready</Text>
          <Text style={styles.stateBody}>
            Your account is authenticated, but a wallet address is not available yet. Try again in a moment or sign out and retry.
          </Text>
          <TouchableOpacity style={styles.stateButton} onPress={() => { void logout(); }}>
            <Text style={styles.stateButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.shell}>

        {/* Main wallet UI */}
        <AppNavigator />

        {/* All bottom sheets — mounted globally so they overlay any tab */}
        <SendSheet    />
        <ReceiveSheet />
        <SwapSheet    />
        <BridgeSheet  />
        <OnrampSheet  />

        {/* Agent morning brief — shown on first load */}
        {!briefDone && (
          <AgentBrief onEnter={() => setBriefDone(true)} />
        )}

      </View>
    </NavigationContainer>
  );
}

function StateCard({ title, body }) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shell: { flex: 1, backgroundColor: Colors.earth },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  stateCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.soil,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
  },
  stateTitle: {
    color: Colors.text,
    fontFamily: Fonts.serif,
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  stateBody: {
    color: Colors.text2,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  stateButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    paddingVertical: 12,
  },
  stateButtonText: {
    color: Colors.earth,
    fontFamily: Fonts.sansBd,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
