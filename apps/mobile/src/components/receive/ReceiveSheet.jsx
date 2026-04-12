import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import SheetModal from '../common/SheetModal';
import { useSheets } from '../../hooks/useSheets';
import { useAuth } from '../../lib/auth';
import { shortAddress } from '../../lib/wallet';
import { Colors, Fonts, Spacing } from '../../constants/theme';

export default function ReceiveSheet() {
  const { isOpen, closeSheet } = useSheets();
  const { walletAddress } = useAuth();
  const [copied, setCopied] = React.useState(false);

  const copyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SheetModal isOpen={isOpen('receive')} onClose={closeSheet} title="Receive">
      <View style={styles.qrWrap}>
        {walletAddress ? (
          <View style={styles.qrBox}>
            <QRCode
              value={walletAddress}
              size={184}
              backgroundColor={Colors.soil}
              color={Colors.text}
            />
          </View>
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrHint}>Wallet address unavailable</Text>
          </View>
        )}
      </View>

      <View style={styles.addrBox}>
        <Text style={styles.addrLbl}>Your Wallet Address · Base</Text>
        <Text style={styles.addrVal} numberOfLines={1}>
          {walletAddress ?? 'No wallet connected'}
        </Text>
        {walletAddress ? <Text style={styles.addrHint}>{shortAddress(walletAddress)}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.copyBtn, !walletAddress && styles.copyBtnDisabled]}
        onPress={() => { void copyAddress(); }}
        disabled={!walletAddress}
      >
        <Text style={styles.copyTxt}>{copied ? '✓ Copied!' : 'Copy Address'}</Text>
      </TouchableOpacity>

      <Text style={styles.warning}>
        Only send assets on Base Network to this address. Sending on other networks may result in permanent loss.
      </Text>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  qrWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
  qrBox: {
    padding: 12,
    backgroundColor: Colors.soil,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrHint: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.mono },
  addrBox: {
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  addrLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 },
  addrVal: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.text2 },
  addrHint: { fontFamily: Fonts.monoBd, fontSize: 11, color: Colors.gold2, marginTop: 6 },
  copyBtn: {
    backgroundColor: Colors.green,
    padding: 13,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  copyBtnDisabled: {
    opacity: 0.5,
  },
  copyTxt: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.earth, textTransform: 'uppercase', letterSpacing: 1 },
  warning: { fontSize: 11, color: Colors.muted, textAlign: 'center', lineHeight: 17, paddingHorizontal: Spacing.sm },
});
