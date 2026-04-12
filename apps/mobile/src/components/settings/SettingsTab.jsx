// src/components/settings/SettingsTab.jsx

import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const SECTIONS = [
  {
    title: 'Security',
    rows: [
      { label: 'Biometric Lock',     value: 'Enabled',     arrow: true  },
      { label: 'Transaction Signing',value: 'Hardware Key', arrow: true  },
      { label: 'Session Timeout',    value: '15 min',       arrow: true  },
    ],
  },
  {
    title: 'Agent',
    rows: [
      { label: 'Max Gas Per Tx',     value: '$0.50',        arrow: true  },
      { label: 'Max Trade Size',     value: '$2,000',       arrow: true  },
      { label: 'Paper Mode',         value: 'Off',          arrow: true  },
      { label: 'Telegram Alerts',    value: 'Connected',    arrow: false, green: true },
    ],
  },
  {
    title: 'Network',
    rows: [
      { label: 'Primary Chain',      value: 'Base',         arrow: true  },
      { label: 'RPC Endpoint',       value: 'Alchemy',      arrow: true  },
      { label: 'Connected Wallets',  value: '1',            arrow: true  },
    ],
  },
  {
    title: 'App',
    rows: [
      { label: 'Currency Display',   value: 'USD',          arrow: true  },
      { label: 'Theme',              value: 'Anara Dark',   arrow: false },
      { label: 'Version',            value: '1.0.0',        arrow: false },
    ],
  },
];

export default function SettingsTab() {
  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Wallet address pill */}
      <View style={styles.addressCard}>
        <Text style={styles.addrLabel}>Connected Wallet</Text>
        <Text style={styles.addrVal}>0x7fC3d4a8E19B…a2B94D</Text>
        <View style={styles.chainPill}>
          <View style={[styles.chainDot, { backgroundColor: Colors.base }]} />
          <Text style={styles.chainTxt}>Base Network</Text>
        </View>
      </View>

      {SECTIONS.map((sec) => (
        <View key={sec.title} style={styles.section}>
          <Text style={styles.secTitle}>{sec.title}</Text>
          <View style={styles.secCard}>
            {sec.rows.map((row, i) => (
              <TouchableOpacity
                key={row.label}
                style={[styles.row, i < sec.rows.length - 1 && styles.rowBorder]}
                activeOpacity={row.arrow ? 0.7 : 1}
              >
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowVal, row.green && { color: Colors.green }]}>{row.value}</Text>
                  {row.arrow && <Text style={styles.rowArrow}>›</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  addressCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.soil,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: 6,
  },
  addrLabel: { fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.4 },
  addrVal: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.text },
  chainPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chainDot: { width: 7, height: 7, borderRadius: 4 },
  chainTxt: { fontSize: 10, fontFamily: Fonts.mono, color: Colors.text2 },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  secTitle: {
    fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 1.6,
    marginBottom: Spacing.sm,
  },
  secCard: { backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(74,53,32,0.4)' },
  rowLabel: { fontSize: 13, fontFamily: Fonts.sansMd, color: Colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowVal: { fontSize: 12, fontFamily: Fonts.mono, color: Colors.text2 },
  rowArrow: { fontSize: 18, color: Colors.muted },
});
