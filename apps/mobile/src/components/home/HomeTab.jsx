// src/components/home/HomeTab.jsx

import React, { useState } from 'react';
import {
  ScrollView, View, Text,
  TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import HeroCard from './HeroCard';
import { useWalletData } from '../../hooks/useWalletData';
import { useWalletStore } from '../../store/wallet';
import {
  assetIcon,
  chainNameFromId,
  formatRelativeTime,
  shortAddress,
} from '../../lib/wallet';
import { Colors, Fonts, Spacing } from '../../constants/theme';

// ── Strategies ────────────────────────────────────
const STRATEGIES = [
  { id: 'arb',    icon: '⚡', name: 'Arb Bot',   pnl: '+$847', sub: '23 runs · 30d', accent: Colors.kola,   on: true  },
  { id: 'yield',  icon: '🌾', name: 'Yield',      pnl: '+$312', sub: 'Aerodrome LP',  accent: Colors.gold,   on: true  },
  { id: 'reb',    icon: '⚖️', name: 'Rebalance', pnl: 'In Range',sub: '±5% thresh', accent: Colors.teal,   on: false },
  { id: 'brickt', icon: '🏗️', name: 'Brickt',    pnl: '+$64',  sub: 'Lagos · Abuja', accent: '#C8956A',     on: true  },
];

function StrategyScroll({ onPress }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stratScroll}>
      {STRATEGIES.map((s) => (
        <TouchableOpacity key={s.id} style={[styles.stratCard, { borderTopColor: s.accent }]} onPress={() => onPress?.(s)}>
          <View style={styles.stratTop}>
            <Text style={styles.stratIcon}>{s.icon}</Text>
            <View style={[styles.stratBadge, { backgroundColor: s.on ? 'rgba(46,204,113,0.12)' : 'rgba(74,53,32,0.5)' }]}>
              <Text style={[styles.stratBadgeTxt, { color: s.on ? Colors.green : Colors.muted }]}>{s.on ? 'On' : 'Watch'}</Text>
            </View>
          </View>
          <Text style={styles.stratName}>{s.name}</Text>
          <Text style={[styles.stratPnl, !s.on && { color: Colors.muted }]}>{s.pnl}</Text>
          <Text style={styles.stratSub}>{s.sub}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Wallet inline tabs ─────────────────────────────
const INLINE_TABS = ['Activity', 'Assets', 'NFTs'];

function AssetRow({ asset }) {
  return (
    <View style={styles.assetRow}>
      <View style={styles.assetIcon}>
        <Text style={styles.assetIconTxt}>{asset.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.assetName}>{asset.sym}</Text>
        <Text style={styles.assetChain}>{asset.chain}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.assetValue}>{asset.value}</Text>
        <Text style={[styles.assetChange, { color: asset.changePos ? Colors.green : Colors.kola }]}>
          {asset.changePos ? '▲' : '▼'} {asset.change24h}
        </Text>
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────
export default function HomeTab() {
  const [inlineTab, setInlineTab] = useState('Activity');
  const { refreshWallet } = useWalletData({ autoRefresh: false });
  const { tokens, transactions, nfts, isLoading, error, lastUpdated } = useWalletStore((state) => ({
    tokens: state.tokens,
    transactions: state.transactions,
    nfts: state.nfts,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
  }));
  const assetRows = tokens.map((token) => ({
    key: `${token.chainId}:${token.address}`,
    icon: assetIcon(token.symbol),
    sym: token.symbol,
    chain: chainNameFromId(token.chainId),
    value: token.balanceUsd,
    change24h: token.change24h,
    changePos: !String(token.change24h ?? '').startsWith('-'),
  }));

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => { void refreshWallet(); }}
          tintColor={Colors.gold2}
        />
      }
    >
      <HeroCard />

      {/* Proverb */}
      <View style={styles.proverb}>
        <Text style={styles.proverbLbl}>Ọrọ àṣà</Text>
        <Text style={styles.proverbTxt}>
          "The wealth of a man is not in his pocket, but in the land he cultivates."
        </Text>
      </View>

      {/* Strategies */}
      <Text style={styles.secLabel}>Strategies</Text>
      <StrategyScroll />

      {/* Wallet tabs */}
      <Text style={styles.secLabel}>Wallet</Text>
      <View style={styles.inlineTabs}>
        {INLINE_TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.itab, inlineTab === t && styles.itabActive]}
            onPress={() => setInlineTab(t)}
          >
            <Text style={[styles.itabTxt, inlineTab === t && styles.itabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {inlineTab === 'Assets' && (
        <View style={styles.assetList}>
          {assetRows.length ? assetRows.map((asset) => (
            <AssetRow key={asset.key} asset={asset} />
          )) : (
            <EmptyState
              title="No assets yet"
              body="Fund the wallet to start seeing live balances here."
            />
          )}
        </View>
      )}
      {inlineTab === 'Activity' && (
        <View style={styles.assetList}>
          {transactions.length ? transactions.map((tx) => (
            <TransactionRow key={`${tx.chainId}:${tx.hash}`} tx={tx} />
          )) : (
            <EmptyState
              title="No activity yet"
              body="Confirmed and pending wallet actions will appear here after sync."
            />
          )}
        </View>
      )}
      {inlineTab === 'NFTs' && (
        <View style={styles.assetList}>
          {nfts.length ? nfts.map((nft) => (
            <NftRow key={`${nft.chain}:${nft.collection}:${nft.tokenId}`} nft={nft} />
          )) : (
            <EmptyState
              title="No NFTs detected"
              body="NFT collections owned by this wallet will appear here."
            />
          )}
        </View>
      )}

      {(error || lastUpdated) ? (
        <View style={styles.statusBox}>
          {error ? <Text style={styles.statusError}>{error}</Text> : null}
          {lastUpdated ? (
            <Text style={styles.statusText}>Last synced {formatRelativeTime(lastUpdated)}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function TransactionRow({ tx }) {
  const isPositive = tx.type === 'receive';
  const subtitle = tx.to
    ? `${chainNameFromId(tx.chainId)} · ${shortAddress(tx.to)}`
    : chainNameFromId(tx.chainId);

  return (
    <View style={styles.assetRow}>
      <View style={styles.assetIcon}>
        <Text style={styles.assetIconTxt}>{tx.type.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.assetName}>{tx.valueFormatted}</Text>
        <Text style={styles.assetChain}>{subtitle}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.assetValue}>{tx.valueUsd ?? tx.type.toUpperCase()}</Text>
        <Text style={[styles.assetChange, { color: isPositive ? Colors.green : Colors.text2 }]}>
          {formatRelativeTime(tx.timestamp)}
        </Text>
      </View>
    </View>
  );
}

function NftRow({ nft }) {
  return (
    <View style={styles.assetRow}>
      <View style={styles.assetIcon}>
        <Text style={styles.assetIconTxt}>NFT</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.assetName}>{nft.name || nft.collection}</Text>
        <Text style={styles.assetChain}>{nft.collection}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.assetValue}>#{nft.tokenId}</Text>
        <Text style={styles.assetChange}>{String(nft.chain).toUpperCase()}</Text>
      </View>
    </View>
  );
}

function EmptyState({ title, body }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.placeholderTxt}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  secLabel: {
    fontSize: 9, fontFamily: Fonts.sansBd,
    color: Colors.muted, textTransform: 'uppercase',
    letterSpacing: 1.6, paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  proverb: {
    marginHorizontal: Spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: Colors.gold,
    paddingLeft: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  proverbLbl: { fontSize: 9, fontFamily: Fonts.monoBd, color: Colors.gold2, letterSpacing: 1.5, marginBottom: 4 },
  proverbTxt: { fontSize: 11, color: Colors.text2, fontStyle: 'italic', lineHeight: 16 },
  stratScroll: { paddingLeft: Spacing.lg, paddingBottom: Spacing.sm },
  stratCard: {
    width: 110, marginRight: 8,
    padding: Spacing.md,
    backgroundColor: Colors.clay,
    borderWidth: 1, borderColor: Colors.border,
    borderTopWidth: 2,
  },
  stratTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  stratIcon: { fontSize: 18 },
  stratBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  stratBadgeTxt: { fontSize: 9, fontFamily: Fonts.sansBd },
  stratName: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.text },
  stratPnl: { fontFamily: Fonts.serif, fontSize: 16, color: Colors.green, marginTop: 2 },
  stratSub: { fontSize: 9, color: Colors.muted, marginTop: 2 },
  inlineTabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  itabActive: { borderBottomWidth: 2, borderBottomColor: Colors.gold },
  itabTxt: { fontSize: 12, fontFamily: Fonts.sansMd, color: Colors.muted },
  itabTxtActive: { color: Colors.gold2, fontFamily: Fonts.sansBd },
  assetList: { marginTop: Spacing.sm },
  assetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(74,53,32,0.4)',
  },
  assetIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.clay2, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  assetIconTxt: { fontFamily: Fonts.monoBd, fontSize: 13, color: Colors.gold2 },
  assetName: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.text },
  assetChain: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.mono, marginTop: 2 },
  assetValue: { fontFamily: Fonts.monoBd, fontSize: 13, color: Colors.text },
  assetChange: { fontSize: 10, fontFamily: Fonts.mono, marginTop: 2 },
  placeholder: { padding: Spacing.xl, alignItems: 'center' },
  emptyTitle: { fontSize: 13, color: Colors.text, fontFamily: Fonts.sansBd, marginBottom: 6 },
  placeholderTxt: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.mono },
  statusBox: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.soil,
  },
  statusText: {
    color: Colors.muted,
    fontFamily: Fonts.mono,
    fontSize: 10,
  },
  statusError: {
    color: Colors.kola,
    fontFamily: Fonts.sansMd,
    fontSize: 11,
    marginBottom: 4,
  },
});
