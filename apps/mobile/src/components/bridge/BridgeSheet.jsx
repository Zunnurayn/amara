import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { createWalletClient, custom } from 'viem';
import { base, bsc, mainnet } from 'viem/chains';
import { executeSwap, getSwapQuote } from '@anara/chain';
import SheetModal from '../common/SheetModal';
import { ProcessingScreen, SuccessScreen } from '../common/ProcessingScreen';
import { useSheets } from '../../hooks/useSheets';
import { useWalletStore } from '../../store/wallet';
import { useAuth } from '../../lib/auth';
import { chainNameFromId } from '../../lib/wallet';
import { useExecuteAction } from '../../hooks/useExecuteAction';
import { useWalletData } from '../../hooks/useWalletData';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const PROC_STEPS = [
  { label: 'Refreshing live bridge route' },
  { label: 'Executing source-chain route' },
  { label: 'Waiting for destination settlement' },
];

const BRIDGE_CHAIN_OPTIONS = [
  { chainId: 8453, name: 'Base', sub: 'L2 · Coinbase', icon: 'B', color: '#1C6EFF' },
  { chainId: 1, name: 'Ethereum', sub: 'L1 · Mainnet', icon: 'E', color: '#627EEA' },
  { chainId: 56, name: 'BNB Chain', sub: 'L1 · Binance', icon: 'B', color: '#F3BA2F' },
];

const BRIDGEABLE_SYMBOLS = ['USDC', 'USDT', 'ETH', 'BNB', 'DAI'];

export default function BridgeSheet() {
  const { isOpen, closeSheet } = useSheets();
  const { embeddedWallet, walletAddress, isEmbeddedWalletConnected } = useAuth();
  const { executeAction } = useExecuteAction();
  const { refreshWallet } = useWalletData({ autoRefresh: false });
  const tokens = useWalletStore((state) => state.tokens);

  const [screen, setScreen] = useState('input');
  const [fromChainId, setFromChainId] = useState(8453);
  const [toChainId, setToChainId] = useState(1);
  const [bridgeTokenSymbol, setBridgeTokenSymbol] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [quoteCard, setQuoteCard] = useState(null);
  const [quoteState, setQuoteState] = useState('idle');
  const [quoteError, setQuoteError] = useState(null);
  const [steps, setSteps] = useState(PROC_STEPS.map((step) => ({ ...step, status: 'idle' })));
  const [txHash, setTxHash] = useState('');

  const bridgeableTokens = useMemo(() => (
    tokens
      .filter((token) => token.chainId === fromChainId)
      .filter((token) => {
        const balance = Number.parseFloat(token.balanceFormatted || '0');
        return Number.isFinite(balance) && balance > 0;
      })
      .filter((token) => BRIDGEABLE_SYMBOLS.includes(token.symbol.toUpperCase()))
  ), [fromChainId, tokens]);

  useEffect(() => {
    if (!bridgeableTokens.length) return;
    if (!bridgeableTokens.some((token) => token.symbol === bridgeTokenSymbol)) {
      setBridgeTokenSymbol(bridgeableTokens[0].symbol);
    }
  }, [bridgeTokenSymbol, bridgeableTokens]);

  const tokenOptions = useMemo(() => {
    const seen = new Set();
    return bridgeableTokens.filter((token) => {
      if (seen.has(token.symbol)) return false;
      seen.add(token.symbol);
      return true;
    });
  }, [bridgeableTokens]);

  const fromChain = BRIDGE_CHAIN_OPTIONS.find((chain) => chain.chainId === fromChainId) ?? BRIDGE_CHAIN_OPTIONS[0];
  const toChain = BRIDGE_CHAIN_OPTIONS.find((chain) => chain.chainId === toChainId) ?? BRIDGE_CHAIN_OPTIONS[1];
  const selectedToken = tokenOptions.find((token) => token.symbol === bridgeTokenSymbol) ?? null;
  const selectedBalance = selectedToken ? Number.parseFloat(selectedToken.balanceFormatted || '0') : 0;
  const amountValue = Number.parseFloat(amount);
  const amountError = !amount.trim()
    ? null
    : !Number.isFinite(amountValue) || amountValue <= 0
      ? 'Enter a valid amount before previewing the bridge.'
      : amountValue > selectedBalance
        ? 'Amount exceeds available balance.'
        : null;

  useEffect(() => {
    if (screen !== 'input') return;
    setQuoteCard(null);
    setQuoteError(null);
    if (!selectedToken || !amount.trim() || amountError || !walletAddress) {
      setQuoteState('idle');
      return;
    }
    if (fromChainId === toChainId) {
      setQuoteState('error');
      setQuoteError('Choose different source and destination chains for the bridge preview.');
      return;
    }

    let cancelled = false;
    setQuoteState('loading');

    async function loadQuote() {
      try {
        const nextQuoteCard = await buildBridgePreviewCard({
          tokens,
          symbol: selectedToken.symbol,
          amount: amount.trim(),
          fromChainId,
          toChainId,
          fromAddress: walletAddress,
        });

        if (!cancelled) {
          if (nextQuoteCard instanceof Error) {
            setQuoteCard(null);
            setQuoteError(nextQuoteCard.message);
            setQuoteState('error');
          } else {
            setQuoteCard(nextQuoteCard);
            setQuoteError(null);
            setQuoteState('ready');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setQuoteCard(null);
          setQuoteError(error instanceof Error ? error.message : 'Bridge quote failed.');
          setQuoteState('error');
        }
      }
    }

    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [amount, amountError, fromChainId, screen, selectedToken, toChainId, tokens, walletAddress]);

  const canReview = Boolean(quoteCard) && quoteState === 'ready';

  const flip = () => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setAmount('');
    setQuoteCard(null);
    setQuoteError(null);
  };

  const handleClose = () => {
    closeSheet();
    setTimeout(() => {
      setScreen('input');
      setAmount('');
      setQuoteCard(null);
      setQuoteError(null);
      setTxHash('');
      setSteps(PROC_STEPS.map((step) => ({ ...step, status: 'idle' })));
    }, 300);
  };

  const handleExecute = async () => {
    if (!quoteCard || !selectedToken) return;
    if (!isEmbeddedWalletConnected || embeddedWallet?.status !== 'connected' || !walletAddress) {
      setQuoteError('Embedded wallet is not connected yet.');
      return;
    }

    setQuoteError(null);
    setScreen('processing');
    setSteps(PROC_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'active' : 'idle' })));

    try {
      const result = await executeAction({
        actionCard: quoteCard,
        chainId: fromChainId,
        submitTransaction: async ({ actionCard }) => {
          setSteps(PROC_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'done' : index === 1 ? 'active' : 'idle' })));
          const submission = await submitQuotedRoute({
            metadata: actionCard.metadata,
            provider: embeddedWallet.provider,
            address: walletAddress,
            activeChainId: fromChainId,
          });
          setSteps(PROC_STEPS.map((step, index) => ({ ...step, status: index <= 1 ? 'done' : 'active' })));
          return submission;
        },
      });

      setSteps(PROC_STEPS.map((step) => ({ ...step, status: 'done' })));
      setTxHash(result.submission.txHash);
      await refreshWallet();
      setScreen('success');
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : 'Unable to execute bridge.');
      setSteps(PROC_STEPS.map((step) => ({ ...step, status: 'idle' })));
      setScreen('review');
    }
  };

  return (
    <SheetModal
      isOpen={isOpen('bridge')}
      onClose={handleClose}
      title={
        screen === 'input' ? 'Bridge' :
        screen === 'review' ? 'Review Bridge' :
        screen === 'processing' ? 'Bridging…' : 'Bridge Complete'
      }
    >
      {screen === 'input' && (
        <View>
          <Text style={styles.fieldLabel}>From Chain</Text>
          <View style={styles.chainRow}>
            <ChainBtn chain={fromChain} active onPress={() => cycleChain(fromChainId, setFromChainId, toChainId)} />
            <TouchableOpacity style={styles.flipBtn} onPress={flip}>
              <Text style={styles.flipIcon}>⇄</Text>
            </TouchableOpacity>
            <ChainBtn chain={toChain} active onPress={() => cycleChain(toChainId, setToChainId, fromChainId)} />
          </View>

          <Text style={styles.fieldLabel}>Asset</Text>
          <View style={styles.tokenChoices}>
            {tokenOptions.map((token) => (
              <TouchableOpacity
                key={token.symbol}
                style={[styles.tokenChoice, bridgeTokenSymbol === token.symbol && styles.tokenChoiceActive]}
                onPress={() => setBridgeTokenSymbol(token.symbol)}
              >
                <Text style={styles.tokenChoiceTitle}>{token.symbol}</Text>
                <Text style={styles.tokenChoiceSub}>{chainNameFromId(token.chainId)}</Text>
                <Text style={styles.tokenChoiceMeta}>{token.balanceFormatted}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!tokenOptions.length ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLbl}>No bridgeable assets found on {fromChain.name}.</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Amount</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.muted2}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <Text style={styles.balHint}>
            {selectedToken ? `Balance: ${selectedToken.balanceFormatted} ${selectedToken.symbol}` : 'Select a source asset'}
          </Text>

          {quoteState === 'loading' ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLbl}>Refreshing live bridge quote…</Text>
            </View>
          ) : null}

          {quoteCard ? (
            <View style={styles.infoBox}>
              {quoteCard.rows.map((row) => (
                <View key={row.label} style={styles.infoRow}>
                  <Text style={styles.infoLbl}>{row.label}</Text>
                  <Text style={[styles.infoVal, row.highlight && { color: Colors.green }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {amountError ? <ErrorBox message={amountError} /> : null}
          {quoteError ? <ErrorBox message={quoteError} /> : null}

          <TouchableOpacity
            style={[styles.cta, { borderTopColor: Colors.teal }, !canReview && { opacity: 0.4 }]}
            onPress={() => { if (canReview) setScreen('review'); }}
            disabled={!canReview}
          >
            <Text style={styles.ctaTxt}>Review Bridge →</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'review' && quoteCard && (
        <View>
          <View style={styles.infoBox}>
            {quoteCard.rows.map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLbl}>{row.label}</Text>
                <Text style={[styles.infoVal, row.highlight && { color: Colors.green }]}>{row.value}</Text>
              </View>
            ))}
          </View>
          {quoteError ? <ErrorBox message={quoteError} /> : null}
          <TouchableOpacity style={[styles.cta, { borderTopColor: Colors.teal }]} onPress={() => { void handleExecute(); }}>
            <Text style={styles.ctaTxt}>Confirm Bridge</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaOutline} onPress={() => setScreen('input')}>
            <Text style={styles.ctaOutlineTxt}>Edit Bridge</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'processing' && (
        <ProcessingScreen
          title="Bridging…"
          subtitle={`Moving ${amount} ${selectedToken?.symbol ?? ''}\n${fromChain.name} → ${toChain.name}`}
          steps={steps}
          accentColor={Colors.teal}
        />
      )}

      {screen === 'success' && (
        <SuccessScreen
          title="Bridge Complete"
          accentColor={Colors.teal}
          subtitle={`${amount} ${selectedToken?.symbol ?? ''} sent from ${fromChain.name} to ${toChain.name}`}
        >
          <View style={styles.hashBox}>
            <Text style={styles.hashLbl}>Transaction Hash</Text>
            <Text style={styles.hashVal}>{txHash}</Text>
          </View>
          <TouchableOpacity style={[styles.cta, { borderTopColor: Colors.teal }]} onPress={handleClose}>
            <Text style={styles.ctaTxt}>Done</Text>
          </TouchableOpacity>
        </SuccessScreen>
      )}
    </SheetModal>
  );
}

function ChainBtn({ chain, onPress }) {
  return (
    <TouchableOpacity style={[styles.chainBtn, { borderTopColor: chain.color }]} onPress={onPress}>
      <View style={[styles.chainIcon, { backgroundColor: `${chain.color}30` }]}>
        <Text style={[styles.chainIconTxt, { color: chain.color }]}>{chain.icon}</Text>
      </View>
      <View>
        <Text style={styles.chainName}>{chain.name}</Text>
        <Text style={styles.chainSub}>{chain.sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ErrorBox({ message }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function cycleChain(currentChainId, setter, blockedChainId) {
  const options = BRIDGE_CHAIN_OPTIONS.map((chain) => chain.chainId).filter((chainId) => chainId !== blockedChainId);
  const currentIndex = options.indexOf(currentChainId);
  const nextChainId = options[(currentIndex + 1) % options.length];
  setter(nextChainId);
}

async function buildBridgePreviewCard({ tokens, symbol, amount, fromChainId, toChainId, fromAddress }) {
  if (!fromAddress) return new Error('A linked wallet is required before previewing a bridge.');
  if (!amount || Number.parseFloat(amount) <= 0) return new Error('Enter a valid amount before previewing the bridge.');
  if (fromChainId === toChainId) return new Error('Choose different source and destination chains for the bridge preview.');
  const fromToken = resolveSwapTokenConfig(tokens, symbol, fromChainId);
  const toToken = resolveSwapTokenConfig(tokens, symbol, toChainId);
  if (!fromToken) return new Error(`${symbol} is not available on ${chainNameFromId(fromChainId)} for this wallet.`);
  if (!toToken) return new Error(`${symbol} is not supported on ${chainNameFromId(toChainId)} yet.`);

  try {
    const quote = await getSwapQuote({
      fromChainId,
      toChainId,
      fromTokenAddress: fromToken.address,
      toTokenAddress: toToken.address,
      fromAmount: toRawAmount(amount, fromToken.decimals),
      fromAddress,
      slippage: 0.005,
    });
    const fromAmount = formatTokenAmount(quote.action.fromAmount, quote.action.fromToken.decimals);
    const toAmount = formatTokenAmount(quote.estimate?.toAmount, quote.action.toToken.decimals);
    const minReceived = formatTokenAmount(quote.estimate?.toAmountMin, quote.action.toToken.decimals);
    const gasUsd = formatUsdValue(quote.estimate?.gasCosts?.reduce((sum, gas) => sum + Number(gas.amountUSD ?? 0), 0) ?? null);
    const feeUsd = formatUsdValue(quote.estimate?.feeCosts?.reduce((sum, fee) => sum + Number(fee.amountUSD ?? 0), 0) ?? null);
    const protocol = quote.toolDetails?.name ?? 'Bridge route';
    const route = quote.includedSteps?.length ? `${quote.includedSteps.length} step${quote.includedSteps.length === 1 ? '' : 's'}` : 'Live route';
    return {
      type: 'bridge',
      title: 'Bridge Preview',
      status: 'pending',
      rows: [
        { label: 'From', value: `${fromAmount} ${quote.action.fromToken.symbol} on ${chainNameFromId(fromChainId)}` },
        { label: 'To', value: `~${toAmount} ${quote.action.toToken.symbol} on ${chainNameFromId(toChainId)}`, highlight: true },
        { label: 'Min received', value: `${minReceived} ${quote.action.toToken.symbol}` },
        { label: 'Protocol', value: protocol },
        { label: 'Route', value: route },
        { label: 'Bridge fee', value: feeUsd },
        { label: 'Est. gas', value: gasUsd },
      ],
      metadata: {
        kind: 'bridge',
        routeId: quote.id,
        tool: quote.toolDetails?.name,
        fromChainId,
        toChainId,
        fromTokenSymbol: quote.action.fromToken.symbol,
        toTokenSymbol: quote.action.toToken.symbol,
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        fromTokenDecimals: quote.action.fromToken.decimals,
        toTokenDecimals: quote.action.toToken.decimals,
        fromAmount: quote.action.fromAmount,
        toAmount: quote.estimate?.toAmount,
        toAmountMin: quote.estimate?.toAmountMin,
        estimatedGasUsd: quote.estimate?.gasCosts?.reduce((sum, gas) => sum + Number(gas.amountUSD ?? 0), 0) ?? undefined,
        estimatedFeeUsd: quote.estimate?.feeCosts?.reduce((sum, fee) => sum + Number(fee.amountUSD ?? 0), 0) ?? undefined,
        steps: quote.includedSteps?.length,
      },
    };
  } catch (error) {
    return new Error(error instanceof Error ? error.message : 'Bridge quote failed.');
  }
}

async function submitQuotedRoute({ metadata, provider, address, activeChainId }) {
  if (!metadata?.fromChainId || !metadata?.toChainId || !metadata?.fromTokenAddress || !metadata?.toTokenAddress || !metadata?.fromAmount) {
    throw new Error('This route is missing quote parameters.');
  }

  const quote = await getSwapQuote({
    fromChainId: metadata.fromChainId,
    toChainId: metadata.toChainId,
    fromTokenAddress: metadata.fromTokenAddress,
    toTokenAddress: metadata.toTokenAddress,
    fromAmount: metadata.fromAmount,
    fromAddress: address,
    slippage: 0.005,
  });

  let latestRouteHash = null;
  let latestRouteChainId = metadata.fromChainId;

  const executedRoute = await executeSwap(
    quote,
    async (targetChainId) => {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      return createWalletClient({
        account: address,
        chain: getChain(targetChainId),
        transport: custom(provider),
      });
    },
    (updatedRoute) => {
      const latest = extractLatestProcess(updatedRoute);
      if (latest?.txHash) latestRouteHash = latest.txHash;
      if (latest?.chainId) latestRouteChainId = latest.chainId;
    }
  );

  const latestProcess = extractLatestProcess(executedRoute);
  const txHash = latestProcess?.txHash ?? latestRouteHash;
  const executedChainId = latestProcess?.chainId ?? latestRouteChainId ?? activeChainId;
  if (!txHash) {
    throw new Error('The route executed without returning a transaction hash.');
  }

  return {
    txHash,
    chainId: executedChainId,
    explorerUrl: latestProcess?.txLink ?? buildExplorerUrl(executedChainId, txHash),
  };
}

function getChain(chainId) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 56:
      return bsc;
    case 8453:
    default:
      return base;
  }
}

function extractLatestProcess(route) {
  return route.steps
    ?.flatMap((step) => step.execution?.process ?? [])
    .sort((left, right) => (right.startedAt ?? 0) - (left.startedAt ?? 0))[0];
}

function buildExplorerUrl(chainId, txHash) {
  const host = chainId === 1
    ? 'https://etherscan.io'
    : chainId === 56
      ? 'https://bscscan.com'
      : 'https://basescan.org';
  return `${host}/tx/${txHash}`;
}

function resolveSwapTokenConfig(tokens, symbol, chainId) {
  const walletToken = tokens.find((token) => token.symbol === symbol && token.chainId === chainId);
  if (walletToken) {
    return {
      address: walletToken.address === 'native' ? '0x0000000000000000000000000000000000000000' : walletToken.address,
      decimals: walletToken.decimals,
    };
  }
  return getKnownTokenConfig(symbol, chainId);
}

function getKnownTokenConfig(symbol, chainId) {
  const normalized = symbol.toUpperCase();
  const knownTokens = {
    ETH: { decimals: 18, addresses: { 1: '0x0000000000000000000000000000000000000000', 8453: '0x0000000000000000000000000000000000000000' } },
    BNB: { decimals: 18, addresses: { 56: '0x0000000000000000000000000000000000000000' } },
    WETH: { decimals: 18, addresses: { 1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 8453: '0x4200000000000000000000000000000000000006' } },
    WBNB: { decimals: 18, addresses: { 56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' } },
    USDC: { decimals: 6, addresses: { 1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' } },
    USDT: { decimals: 6, addresses: { 1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', 8453: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', 56: '0x55d398326f99059fF775485246999027B3197955' } },
    DAI: { decimals: 18, addresses: { 1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', 8453: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' } },
  };
  const config = knownTokens[normalized];
  const address = config?.addresses?.[chainId];
  if (!config || !address) return null;
  return { address, decimals: config.decimals };
}

function toRawAmount(amount, decimals) {
  const [wholePart, fractionPart = ''] = amount.trim().split('.');
  const normalizedWhole = wholePart === '' ? '0' : wholePart;
  const normalizedFraction = fractionPart.replace(/\D/g, '').slice(0, decimals).padEnd(decimals, '0');
  const raw = `${normalizedWhole}${normalizedFraction}`.replace(/^0+(?=\d)/, '');
  return raw || '0';
}

function formatTokenAmount(value, decimals, precision = 6) {
  if (!value) return '0';
  const bigintValue = BigInt(value);
  const padded = bigintValue.toString().padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, '').slice(0, precision);
  return fraction ? `${whole}.${fraction}` : whole;
}

function formatUsdValue(value) {
  if (!value || !Number.isFinite(value)) return 'Unavailable';
  if (value < 0.01) return '<$0.01';
  return `$${value.toFixed(2)}`;
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 10, fontFamily: Fonts.sansBd, color: Colors.muted,
    letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 6, marginTop: Spacing.md,
  },
  chainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  chainBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
    borderTopWidth: 2, padding: 10,
  },
  chainIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chainIconTxt: { fontFamily: Fonts.monoBd, fontSize: 11 },
  chainName: { fontFamily: Fonts.sansBd, fontSize: 12, color: Colors.text },
  chainSub: { fontSize: 9, color: Colors.muted, marginTop: 1 },
  flipBtn: {
    width: 36, height: 36, backgroundColor: Colors.clay2,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  flipIcon: { fontSize: 16, color: Colors.teal },
  tokenChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  tokenChoice: {
    minWidth: '31%',
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  tokenChoiceActive: {
    borderColor: Colors.teal,
    backgroundColor: 'rgba(72,201,176,0.08)',
  },
  tokenChoiceTitle: { color: Colors.text, fontFamily: Fonts.sansBd, fontSize: 12 },
  tokenChoiceSub: { color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, marginTop: 2 },
  tokenChoiceMeta: { color: Colors.gold2, fontFamily: Fonts.monoBd, fontSize: 10, marginTop: 5 },
  field: { backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  input: { padding: 11, fontSize: 16, fontFamily: Fonts.monoBd, color: Colors.text },
  balHint: { fontSize: 10, fontFamily: Fonts.mono, color: Colors.muted, marginBottom: Spacing.md },
  infoBox: { backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(74,53,32,0.4)',
  },
  infoLbl: { fontSize: 11, color: Colors.muted },
  infoVal: { fontSize: 11, fontFamily: Fonts.mono, color: Colors.text2, maxWidth: '58%', textAlign: 'right' },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.25)',
    backgroundColor: 'rgba(192,57,43,0.08)',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.kola,
    fontFamily: Fonts.sansMd,
    fontSize: 11,
    lineHeight: 16,
  },
  cta: {
    backgroundColor: Colors.gold, borderTopWidth: 2,
    padding: 13, alignItems: 'center', marginTop: Spacing.sm,
  },
  ctaTxt: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.earth, textTransform: 'uppercase', letterSpacing: 1 },
  ctaOutline: {
    borderWidth: 1, borderColor: Colors.border, padding: 11, alignItems: 'center', marginTop: 8,
  },
  ctaOutlineTxt: { fontFamily: Fonts.sansBd, fontSize: 12, color: Colors.text2 },
  hashBox: { width: '100%', padding: Spacing.md, backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.md },
  hashLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  hashVal: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.teal },
});
