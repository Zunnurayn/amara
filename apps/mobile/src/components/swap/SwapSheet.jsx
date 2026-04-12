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
import { chainNameFromId, shortAddress } from '../../lib/wallet';
import { useExecuteAction } from '../../hooks/useExecuteAction';
import { useWalletData } from '../../hooks/useWalletData';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const PROC_STEPS = [
  { label: 'Refreshing live route quote' },
  { label: 'Executing route and approvals' },
  { label: 'Waiting for on-chain confirmation' },
];

const QUOTE_TOKEN_SYMBOLS = ['USDC', 'ETH', 'USDT', 'DAI', 'BNB', 'WETH', 'WBNB'];

export default function SwapSheet() {
  const { isOpen, closeSheet } = useSheets();
  const { embeddedWallet, walletAddress, isEmbeddedWalletConnected } = useAuth();
  const { executeAction } = useExecuteAction();
  const { refreshWallet } = useWalletData({ autoRefresh: false });
  const tokens = useWalletStore((state) => state.tokens);

  const swappableTokens = useMemo(() => (
    tokens.filter((token) => {
      const balance = Number.parseFloat(token.balanceFormatted || '0');
      return Number.isFinite(balance) && balance > 0;
    })
  ), [tokens]);

  const [screen, setScreen] = useState('input');
  const [fromTokenKey, setFromTokenKey] = useState(null);
  const [toTokenKey, setToTokenKey] = useState(null);
  const [fromAmt, setFromAmt] = useState('');
  const [quoteCard, setQuoteCard] = useState(null);
  const [quoteState, setQuoteState] = useState('idle');
  const [quoteError, setQuoteError] = useState(null);
  const [steps, setSteps] = useState(PROC_STEPS.map((step) => ({ ...step, status: 'idle' })));
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!swappableTokens.length) {
      setFromTokenKey(null);
      return;
    }
    if (!fromTokenKey || !swappableTokens.some((token) => tokenKey(token) === fromTokenKey)) {
      setFromTokenKey(tokenKey(swappableTokens[0]));
    }
  }, [fromTokenKey, swappableTokens]);

  const fromToken = swappableTokens.find((token) => tokenKey(token) === fromTokenKey) ?? null;
  const targetOptions = useMemo(() => {
    if (!fromToken) return [];
    const sameChainWalletTokens = tokens
      .filter((token) => token.chainId === fromToken.chainId && token.symbol !== fromToken.symbol)
      .map((token) => ({
        key: tokenKey(token),
        symbol: token.symbol,
        chainId: token.chainId,
        decimals: token.decimals,
        address: token.address,
      }));

    const known = QUOTE_TOKEN_SYMBOLS
      .filter((symbol) => symbol !== fromToken.symbol)
      .map((symbol) => resolveSwapTokenConfig(tokens, symbol, fromToken.chainId))
      .filter(Boolean)
      .map((token) => ({
        key: `${token.chainId}:${token.address}:${token.symbol}`,
        symbol: token.symbol,
        chainId: token.chainId,
        decimals: token.decimals,
        address: token.address,
      }));

    const merged = [...sameChainWalletTokens, ...known];
    const seen = new Set();
    return merged.filter((token) => {
      if (seen.has(token.key)) return false;
      seen.add(token.key);
      return true;
    });
  }, [fromToken, tokens]);

  useEffect(() => {
    if (!targetOptions.length) {
      setToTokenKey(null);
      return;
    }
    if (!toTokenKey || !targetOptions.some((token) => token.key === toTokenKey)) {
      setToTokenKey(targetOptions[0].key);
    }
  }, [targetOptions, toTokenKey]);

  const toToken = targetOptions.find((token) => token.key === toTokenKey) ?? null;
  const selectedBalance = fromToken ? Number.parseFloat(fromToken.balanceFormatted || '0') : 0;
  const amountValue = Number.parseFloat(fromAmt);
  const amountError = !fromAmt.trim()
    ? null
    : !Number.isFinite(amountValue) || amountValue <= 0
      ? 'Enter a valid amount before previewing the swap.'
      : amountValue > selectedBalance
        ? 'Amount exceeds available balance.'
        : null;

  useEffect(() => {
    if (screen !== 'input') return;
    setQuoteCard(null);
    setQuoteError(null);
    if (!fromToken || !toToken || !fromAmt.trim() || amountError || !walletAddress) {
      setQuoteState('idle');
      return;
    }

    let cancelled = false;
    setQuoteState('loading');

    async function loadQuote() {
      try {
        const nextQuoteCard = await buildSwapPreviewCard({
          tokens,
          fromToken,
          toToken,
          amount: fromAmt.trim(),
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
          setQuoteError(error instanceof Error ? error.message : 'Swap quote failed.');
          setQuoteState('error');
        }
      }
    }

    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [amountError, fromAmt, fromToken, screen, toToken, tokens, walletAddress]);

  const derivedOutput = quoteCard?.rows.find((row) => row.label === 'You receive')?.value?.replace(/^~/, '') ?? '';
  const canReview = Boolean(quoteCard) && quoteState === 'ready';

  const flip = () => {
    if (!fromToken || !toToken) return;
    const nextFromKey = `${toToken.chainId}:${toToken.address}:${toToken.symbol}`;
    setFromTokenKey(nextFromKey);
    setToTokenKey(`${fromToken.chainId}:${fromToken.address}:${fromToken.symbol}`);
    setFromAmt('');
    setQuoteCard(null);
    setQuoteError(null);
  };

  const handleClose = () => {
    closeSheet();
    setTimeout(() => {
      setScreen('input');
      setFromAmt('');
      setQuoteCard(null);
      setQuoteError(null);
      setTxHash('');
      setSteps(PROC_STEPS.map((step) => ({ ...step, status: 'idle' })));
    }, 300);
  };

  const handleExecute = async () => {
    if (!quoteCard || !fromToken) return;
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
        chainId: fromToken.chainId,
        submitTransaction: async ({ actionCard }) => {
          setSteps(PROC_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'done' : index === 1 ? 'active' : 'idle' })));
          const submission = await submitQuotedRoute({
            metadata: actionCard.metadata,
            provider: embeddedWallet.provider,
            address: walletAddress,
            activeChainId: fromToken.chainId,
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
      setQuoteError(error instanceof Error ? error.message : 'Unable to execute swap.');
      setSteps(PROC_STEPS.map((step) => ({ ...step, status: 'idle' })));
      setScreen('review');
    }
  };

  return (
    <SheetModal
      isOpen={isOpen('swap')}
      onClose={handleClose}
      title={
        screen === 'input' ? 'Swap' :
        screen === 'review' ? 'Review Swap' :
        screen === 'processing' ? 'Swapping…' : 'Swap Complete'
      }
    >
      {screen === 'input' && (
        <View>
          <Text style={styles.fieldLabel}>You Pay</Text>
          <TokenSelector
            selectedKey={fromTokenKey}
            options={swappableTokens.map((token) => ({
              key: tokenKey(token),
              symbol: token.symbol,
              chainName: chainNameFromId(token.chainId),
              balance: token.balanceFormatted,
            }))}
            onSelect={setFromTokenKey}
          />
          <View style={styles.swapField}>
            <Text style={styles.swapTokenLabel}>{fromToken?.symbol ?? 'Token'}</Text>
            <TextInput
              style={styles.swapInput}
              placeholder="0.00"
              placeholderTextColor={Colors.muted2}
              keyboardType="decimal-pad"
              value={fromAmt}
              onChangeText={setFromAmt}
            />
          </View>
          <Text style={styles.balHint}>
            {fromToken ? `Balance: ${fromToken.balanceFormatted} ${fromToken.symbol}` : 'No swappable assets available'}
          </Text>

          <TouchableOpacity style={styles.flipBtn} onPress={flip} disabled={!fromToken || !toToken}>
            <Text style={styles.flipIcon}>⇅</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>You Receive</Text>
          <TokenSelector
            selectedKey={toTokenKey}
            options={targetOptions.map((token) => ({
              key: token.key,
              symbol: token.symbol,
              chainName: chainNameFromId(token.chainId),
              balance: null,
            }))}
            onSelect={setToTokenKey}
          />
          <View style={styles.swapField}>
            <Text style={styles.swapTokenLabel}>{toToken?.symbol ?? 'Token'}</Text>
            <TextInput
              style={[styles.swapInput, { color: Colors.green }]}
              placeholder="0.00"
              placeholderTextColor={Colors.muted2}
              editable={false}
              value={derivedOutput}
            />
          </View>

          {quoteState === 'loading' ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLbl}>Refreshing live quote…</Text>
            </View>
          ) : null}

          {quoteCard ? (
            <View style={styles.infoBox}>
              {quoteCard.rows.slice(2).map((row) => (
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
            style={[styles.cta, !canReview && { opacity: 0.4 }]}
            onPress={() => { if (canReview) setScreen('review'); }}
            disabled={!canReview}
          >
            <Text style={styles.ctaTxt}>Review Swap →</Text>
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
          <TouchableOpacity style={styles.cta} onPress={() => { void handleExecute(); }}>
            <Text style={styles.ctaTxt}>Confirm Swap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaOutline} onPress={() => setScreen('input')}>
            <Text style={styles.ctaOutlineTxt}>Edit Swap</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'processing' && (
        <ProcessingScreen
          title="Swapping…"
          subtitle={`${fromAmt} ${fromToken?.symbol ?? ''} → ${derivedOutput || toToken?.symbol || ''}`}
          steps={steps}
          accentColor={Colors.gold}
        />
      )}

      {screen === 'success' && (
        <SuccessScreen
          title="Swap Complete"
          subtitle={`${fromAmt} ${fromToken?.symbol ?? ''} → ${derivedOutput}`}
          accentColor={Colors.gold}
        >
          <View style={styles.hashBox}>
            <Text style={styles.hashLbl}>Transaction Hash</Text>
            <Text style={styles.hashVal}>{txHash}</Text>
          </View>
          <TouchableOpacity style={styles.cta} onPress={handleClose}>
            <Text style={styles.ctaTxt}>Done</Text>
          </TouchableOpacity>
        </SuccessScreen>
      )}
    </SheetModal>
  );
}

function TokenSelector({ selectedKey, options, onSelect }) {
  return (
    <View style={styles.tokenChoices}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[styles.tokenChoice, selectedKey === option.key && styles.tokenChoiceActive]}
          onPress={() => onSelect(option.key)}
        >
          <Text style={styles.tokenChoiceTitle}>{option.symbol}</Text>
          <Text style={styles.tokenChoiceSub}>{option.chainName}</Text>
          {option.balance ? <Text style={styles.tokenChoiceMeta}>{option.balance}</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ErrorBox({ message }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function tokenKey(token) {
  return `${token.chainId}:${token.address}:${token.symbol}`;
}

async function buildSwapPreviewCard({ tokens, fromToken, toToken, amount, fromAddress }) {
  if (!fromAddress) return new Error('A linked wallet is required before previewing a swap.');
  if (!amount || Number.parseFloat(amount) <= 0) return new Error('Enter a valid amount before previewing the swap.');
  if (fromToken.symbol === toToken.symbol && fromToken.chainId === toToken.chainId) return new Error('Choose different assets for the swap preview.');

  const fromConfig = resolveSwapTokenConfig(tokens, fromToken.symbol, fromToken.chainId);
  const toConfig = resolveSwapTokenConfig(tokens, toToken.symbol, toToken.chainId);
  if (!fromConfig) return new Error(`${fromToken.symbol} is not available on ${chainNameFromId(fromToken.chainId)} for this wallet.`);
  if (!toConfig) return new Error(`${toToken.symbol} is not supported on ${chainNameFromId(toToken.chainId)} yet.`);

  try {
    const quote = await getSwapQuote({
      fromChainId: fromToken.chainId,
      toChainId: toToken.chainId,
      fromTokenAddress: fromConfig.address,
      toTokenAddress: toConfig.address,
      fromAmount: toRawAmount(amount, fromConfig.decimals),
      fromAddress,
      slippage: 0.005,
    });
    const fromAmount = formatTokenAmount(quote.action.fromAmount, quote.action.fromToken.decimals);
    const toAmount = formatTokenAmount(quote.estimate?.toAmount, quote.action.toToken.decimals);
    const minReceived = formatTokenAmount(quote.estimate?.toAmountMin, quote.action.toToken.decimals);
    const gasUsd = formatUsdValue(quote.estimate?.gasCosts?.reduce((sum, gas) => sum + Number(gas.amountUSD ?? 0), 0) ?? null);
    const feeUsd = formatUsdValue(quote.estimate?.feeCosts?.reduce((sum, fee) => sum + Number(fee.amountUSD ?? 0), 0) ?? null);
    const rate = computeSwapRate(fromAmount, toAmount);
    const route = quote.toolDetails?.name
      ? `${quote.toolDetails.name} · ${chainNameFromId(fromToken.chainId)}`
      : chainNameFromId(fromToken.chainId);
    return {
      type: 'swap',
      title: 'Swap Preview',
      status: 'pending',
      rows: [
        { label: 'You send', value: `${fromAmount} ${quote.action.fromToken.symbol}` },
        { label: 'You receive', value: `~${toAmount} ${quote.action.toToken.symbol}`, highlight: true },
        { label: 'Rate', value: rate ? `1 ${quote.action.fromToken.symbol} = ${rate} ${quote.action.toToken.symbol}` : 'Unavailable' },
        { label: 'Min received', value: `${minReceived} ${quote.action.toToken.symbol}` },
        { label: 'Route', value: route },
        { label: 'Route fee', value: feeUsd },
        { label: 'Est. gas', value: gasUsd },
      ],
      metadata: {
        kind: 'swap',
        routeId: quote.id,
        tool: quote.toolDetails?.name,
        fromChainId: fromToken.chainId,
        toChainId: toToken.chainId,
        fromTokenSymbol: quote.action.fromToken.symbol,
        toTokenSymbol: quote.action.toToken.symbol,
        fromTokenAddress: fromConfig.address,
        toTokenAddress: toConfig.address,
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
    return new Error(error instanceof Error ? error.message : 'Swap quote failed.');
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
      symbol,
      chainId,
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
  return { symbol, chainId, address, decimals: config.decimals };
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

function computeSwapRate(fromAmount, toAmount) {
  const from = Number.parseFloat(fromAmount);
  const to = Number.parseFloat(toAmount);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0) return null;
  return (to / from).toFixed(6);
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 10, fontFamily: Fonts.sansBd, color: Colors.muted,
    letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 6,
  },
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
    borderColor: Colors.gold2,
    backgroundColor: 'rgba(212,146,10,0.08)',
  },
  tokenChoiceTitle: { color: Colors.text, fontFamily: Fonts.sansBd, fontSize: 12 },
  tokenChoiceSub: { color: Colors.muted, fontFamily: Fonts.mono, fontSize: 9, marginTop: 2 },
  tokenChoiceMeta: { color: Colors.gold2, fontFamily: Fonts.monoBd, fontSize: 10, marginTop: 5 },
  swapField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
    paddingLeft: 10, marginBottom: 4,
  },
  swapTokenLabel: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.text, marginRight: 8 },
  swapInput: {
    flex: 1, padding: 11, fontSize: 16,
    fontFamily: Fonts.monoBd, color: Colors.text, textAlign: 'right',
  },
  balHint: { fontSize: 10, fontFamily: Fonts.mono, color: Colors.muted, marginBottom: Spacing.md },
  flipBtn: {
    alignSelf: 'center', width: 36, height: 36,
    backgroundColor: Colors.clay2, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginVertical: 2,
  },
  flipIcon: { fontSize: 18, color: Colors.gold2 },
  infoBox: {
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
    marginVertical: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(74,53,32,0.4)',
  },
  infoLbl: { fontSize: 11, color: Colors.muted },
  infoVal: { fontSize: 11, fontFamily: Fonts.mono, color: Colors.text2, maxWidth: '60%', textAlign: 'right' },
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
  cta: { backgroundColor: Colors.gold, padding: 13, alignItems: 'center', marginTop: Spacing.lg },
  ctaTxt: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.earth, textTransform: 'uppercase', letterSpacing: 1 },
  ctaOutline: {
    borderWidth: 1, borderColor: Colors.border, padding: 11, alignItems: 'center', marginTop: 8,
  },
  ctaOutlineTxt: { fontFamily: Fonts.sansBd, fontSize: 12, color: Colors.text2 },
  hashBox: {
    width: '100%', padding: Spacing.md,
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.md,
  },
  hashLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  hashVal: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.gold2 },
});
