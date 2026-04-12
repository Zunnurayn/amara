// src/components/home/HeroCard.jsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSheets } from '../../hooks/useSheets';
import { useWalletStore } from '../../store/wallet';
import { chainColorFromId, derivePortfolioChangePercent, formatPercent } from '../../lib/wallet';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const ACTIONS = [
  { key: 'send',    label: 'Send',    icon: '↑', accent: Colors.kola   },
  { key: 'receive', label: 'Receive', icon: '↓', accent: Colors.green  },
  { key: 'swap',    label: 'Swap',    icon: '⇄', accent: Colors.gold   },
  { key: 'bridge',  label: 'Bridge',  icon: '⛓', accent: Colors.teal   },
  { key: 'onramp',  label: 'Buy',     icon: '+$', accent: Colors.purple },
];

export default function HeroCard() {
  const { openSheet } = useSheets();
  const { totalUsd, change24h, chains, isLoading } = useWalletStore((state) => ({
    totalUsd: state.totalUsd,
    change24h: state.change24h,
    chains: state.chains,
    isLoading: state.isLoading,
  }));
  const changePercent = formatPercent(derivePortfolioChangePercent(totalUsd, change24h));
  const positiveChange = !String(change24h).trim().startsWith('-');
  const chainSegments = chains.length
    ? chains.filter((chain) => chain.totalUsd).map((chain) => ({
        chainId: chain.chainId,
        total: Math.max(Number(String(chain.totalUsd).replace(/[$,]/g, '')) || 0, 1),
      }))
    : [
        { chainId: 8453, total: 60 },
        { chainId: 1, total: 40 },
      ];
  const totalChainWeight = chainSegments.reduce((sum, segment) => sum + segment.total, 0);

  return (
    <View style={styles.card}>
      {/* Balance */}
      <View style={styles.inner}>
        <Text style={styles.label}>Total Portfolio Value</Text>
        <Text style={styles.value}>
          {isLoading ? 'Loading…' : totalUsd}
        </Text>
        <View style={styles.changeRow}>
          <View style={[styles.changeBadge, positiveChange ? styles.changeBadgePositive : styles.changeBadgeNegative]}>
            <Text style={[styles.changeText, !positiveChange && styles.changeTextNegative]}>
              {positiveChange ? '▲' : '▼'} {change24h} ({changePercent})
            </Text>
          </View>
          <Text style={styles.changePeriod}>{isLoading ? 'Syncing' : '24h'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: Colors.gold2 }]}>+$847</Text>
          <Text style={styles.statLbl}>Arb 30d</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: Colors.teal }]}>18.4%</Text>
          <Text style={styles.statLbl}>Yield APY</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#C8956A' }]}>4</Text>
          <Text style={styles.statLbl}>Brickt</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[styles.actionBtn, { borderTopColor: a.accent }]}
            onPress={() => openSheet(a.key)}
            activeOpacity={0.75}
          >
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <Text style={styles.actionLbl}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chain bar */}
      <View style={styles.chainBar}>
        {chainSegments.map((segment) => (
          <View
            key={segment.chainId}
            style={[
              styles.chainSeg,
              {
                backgroundColor: chainColorFromId(segment.chainId),
                flex: segment.total / Math.max(totalChainWeight, 1),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: Spacing.lg,
    backgroundColor: Colors.soil,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  inner: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  label: {
    fontSize: 10,
    fontFamily: Fonts.sansBd,
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontFamily: Fonts.serif,
    fontSize: 42,
    color: Colors.text,
    lineHeight: 48,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  changeBadge: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  changeBadgePositive: {
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  changeBadgeNegative: {
    backgroundColor: 'rgba(192,57,43,0.16)',
  },
  changeText: {
    fontSize: 11,
    fontFamily: Fonts.monoBd,
    color: Colors.green,
  },
  changeTextNegative: {
    color: Colors.kola,
  },
  changePeriod: {
    fontSize: 10,
    color: Colors.muted,
    fontFamily: Fonts.mono,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.xl,
  },
  stat: {},
  statNum: { fontFamily: Fonts.serif, fontSize: 16, fontWeight: '900' },
  statLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 1 },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: Colors.clay2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 2,
  },
  actionIcon: { fontSize: 16, color: Colors.text, fontFamily: Fonts.sansBd },
  actionLbl:  { fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.text2, textTransform: 'uppercase', letterSpacing: 1 },
  chainBar: { flexDirection: 'row', height: 2 },
  chainSeg: { height: 2 },
});
