import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { encodeFunctionData, erc20Abi, isAddress, parseUnits } from 'viem';
import SheetModal from '../common/SheetModal';
import { ProcessingScreen, SuccessScreen } from '../common/ProcessingScreen';
import { useSheets } from '../../hooks/useSheets';
import { useWalletStore } from '../../store/wallet';
import { useAuth } from '../../lib/auth';
import { chainNameFromId, formatUsd, shortAddress } from '../../lib/wallet';
import { useExecuteAction } from '../../hooks/useExecuteAction';
import { useWalletData } from '../../hooks/useWalletData';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const PROCESSING_STEPS = [
  { label: 'Simulating transfer' },
  { label: 'Requesting wallet signature' },
  { label: 'Waiting for on-chain confirmation' },
];

export default function SendSheet() {
  const { isOpen, closeSheet } = useSheets();
  const { embeddedWallet, isEmbeddedWalletConnected, walletAddress } = useAuth();
  const { refreshWallet } = useWalletData({ autoRefresh: false });
  const { executeAction } = useExecuteAction();
  const tokens = useWalletStore((state) => state.tokens);

  const sendableTokens = useMemo(() => (
    tokens.filter((token) => {
      const balance = Number.parseFloat(token.balanceFormatted || '0');
      return Number.isFinite(balance) && balance > 0;
    })
  ), [tokens]);

  const [selectedTokenKey, setSelectedTokenKey] = useState(null);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [screen, setScreen] = useState('input');
  const [processingSteps, setProcessingSteps] = useState(PROCESSING_STEPS.map((step) => ({ ...step, status: 'idle' })));
  const [sheetError, setSheetError] = useState(null);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (!sendableTokens.length) {
      setSelectedTokenKey(null);
      return;
    }

    if (!selectedTokenKey || !sendableTokens.some((token) => tokenKey(token) === selectedTokenKey)) {
      setSelectedTokenKey(tokenKey(sendableTokens[0]));
    }
  }, [selectedTokenKey, sendableTokens]);

  const selectedToken = sendableTokens.find((token) => tokenKey(token) === selectedTokenKey) ?? null;
  const parsedAmount = Number.parseFloat(amount);
  const amountIsValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const selectedBalance = selectedToken ? Number.parseFloat(selectedToken.balanceFormatted || '0') : 0;
  const recipientIsValid = isAddress(recipient.trim());
  const exceedsBalance = amountIsValid && selectedToken ? parsedAmount > selectedBalance : false;
  const estimatedUsd = selectedToken && amountIsValid
    ? formatUsd(parsedAmount * (Number.parseFloat(String(selectedToken.priceUsd).replace(/[$,]/g, '')) || 0))
    : '$0.00';

  const actionCard = useMemo(() => {
    if (!selectedToken || !amountIsValid || !recipientIsValid || exceedsBalance) return null;
    return {
      type: 'send',
      title: 'Send Preview',
      status: 'pending',
      rows: [
        { label: 'Asset', value: selectedToken.symbol },
        { label: 'Amount', value: `${amount.trim()} ${selectedToken.symbol}`, highlight: true },
        { label: 'USD', value: `~${estimatedUsd}` },
        { label: 'To', value: shortAddress(recipient.trim()) },
        { label: 'Network', value: chainNameFromId(selectedToken.chainId) },
        { label: 'Est. gas', value: '~$0.04' },
      ],
      metadata: {
        kind: 'send',
        fromChainId: selectedToken.chainId,
        fromTokenSymbol: selectedToken.symbol,
        fromTokenAddress: selectedToken.address === 'native'
          ? '0x0000000000000000000000000000000000000000'
          : selectedToken.address,
        fromTokenDecimals: selectedToken.decimals,
        fromAmount: amount.trim(),
        toAddress: recipient.trim(),
        estimatedGasUsd: 0.04,
      },
    };
  }, [amount, amountIsValid, estimatedUsd, exceedsBalance, recipient, recipientIsValid, selectedToken]);

  const canReview = Boolean(actionCard);

  const handleClose = () => {
    closeSheet();
    setTimeout(() => {
      setScreen('input');
      setAmount('');
      setRecipient('');
      setSheetError(null);
      setTxHash('');
      setProcessingSteps(PROCESSING_STEPS.map((step) => ({ ...step, status: 'idle' })));
    }, 300);
  };

  const handleExecute = async () => {
    if (!actionCard || !selectedToken) return;
    if (!isEmbeddedWalletConnected || embeddedWallet?.status !== 'connected') {
      setSheetError('Embedded wallet is not connected yet.');
      return;
    }

    setSheetError(null);
    setScreen('processing');
    setProcessingSteps(PROCESSING_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'active' : 'idle' })));

    try {
      const result = await executeAction({
        actionCard,
        chainId: selectedToken.chainId,
        submitTransaction: async ({ chainId }) => {
          setProcessingSteps(PROCESSING_STEPS.map((step, index) => ({ ...step, status: index === 0 ? 'done' : index === 1 ? 'active' : 'idle' })));

          const txRequest = buildTransactionRequest({
            token: selectedToken,
            recipient: recipient.trim(),
            amount: amount.trim(),
            chainId,
            from: walletAddress,
          });

          const hash = await embeddedWallet.provider.request({
            method: 'eth_sendTransaction',
            params: [txRequest],
          });

          setProcessingSteps(PROCESSING_STEPS.map((step, index) => ({ ...step, status: index <= 1 ? 'done' : 'active' })));

          return {
            txHash: String(hash),
            chainId,
            explorerUrl: getExplorerUrl(chainId, String(hash)),
          };
        },
      });

      setProcessingSteps(PROCESSING_STEPS.map((step) => ({ ...step, status: 'done' })));
      setTxHash(result.submission.txHash);
      await refreshWallet();
      setScreen('success');
    } catch (error) {
      setSheetError(error instanceof Error ? error.message : 'Unable to send asset.');
      setScreen('review');
      setProcessingSteps(PROCESSING_STEPS.map((step) => ({ ...step, status: 'idle' })));
    }
  };

  return (
    <SheetModal
      isOpen={isOpen('send')}
      onClose={handleClose}
      title={
        screen === 'input' ? 'Send' :
        screen === 'review' ? 'Review Send' :
        screen === 'processing' ? 'Sending…' : 'Send Complete'
      }
      snapPoints={['88%']}
    >
      {screen === 'input' && (
        <View>
          <Text style={styles.fieldLabel}>Asset</Text>
          <View style={styles.choiceGrid}>
            {sendableTokens.map((token) => (
              <TouchableOpacity
                key={tokenKey(token)}
                style={[
                  styles.choiceBtn,
                  selectedTokenKey === tokenKey(token) && styles.choiceBtnActive,
                ]}
                onPress={() => setSelectedTokenKey(tokenKey(token))}
              >
                <Text style={styles.choiceTitle}>{token.symbol}</Text>
                <Text style={styles.choiceSub}>{chainNameFromId(token.chainId)}</Text>
                <Text style={styles.choiceMeta}>{token.balanceFormatted}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!sendableTokens.length ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>No sendable assets</Text>
              <Text style={styles.infoBody}>Fund the wallet before using the send flow.</Text>
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
          {selectedToken ? (
            <Text style={styles.hint}>
              Balance: {selectedToken.balanceFormatted} {selectedToken.symbol} · {estimatedUsd}
            </Text>
          ) : null}

          <Text style={styles.fieldLabel}>Recipient</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              placeholder="0x1111111111111111111111111111111111111111"
              placeholderTextColor={Colors.muted2}
              autoCapitalize="none"
              autoCorrect={false}
              value={recipient}
              onChangeText={setRecipient}
            />
          </View>
          <Text style={styles.hint}>Only EVM addresses are supported in this flow right now.</Text>

          {sheetError ? <ErrorBox message={sheetError} /> : null}
          {!recipientIsValid && recipient.trim() ? <ErrorBox message="Enter a valid recipient address." /> : null}
          {exceedsBalance ? <ErrorBox message="Amount exceeds available balance." /> : null}

          <TouchableOpacity
            style={[styles.cta, !canReview && styles.ctaDisabled]}
            onPress={() => {
              if (!canReview) return;
              setSheetError(null);
              setScreen('review');
            }}
            disabled={!canReview}
          >
            <Text style={styles.ctaTxt}>Review Send →</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'review' && actionCard && selectedToken && (
        <View>
          <View style={styles.reviewCard}>
            {actionCard.rows.map((row) => (
              <View key={row.label} style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{row.label}</Text>
                <Text style={[styles.reviewValue, row.highlight && styles.reviewValueHighlight]}>{row.value}</Text>
              </View>
            ))}
          </View>

          {sheetError ? <ErrorBox message={sheetError} /> : null}

          <TouchableOpacity style={styles.cta} onPress={() => { void handleExecute(); }}>
            <Text style={styles.ctaTxt}>Confirm And Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaOutline} onPress={() => setScreen('input')}>
            <Text style={styles.ctaOutlineTxt}>Edit Transfer</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'processing' && (
        <ProcessingScreen
          title="Sending…"
          subtitle={`${amount} ${selectedToken?.symbol ?? ''} to ${shortAddress(recipient.trim())}`}
          steps={processingSteps}
          accentColor={Colors.kola}
        />
      )}

      {screen === 'success' && selectedToken && (
        <SuccessScreen
          title="Send Complete"
          subtitle={`${amount} ${selectedToken.symbol} sent to ${shortAddress(recipient.trim())}`}
          accentColor={Colors.kola}
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

function buildTransactionRequest({ token, recipient, amount, chainId, from }) {
  if (token.address === 'native') {
    return {
      from,
      to: recipient,
      value: `0x${parseUnits(amount, token.decimals).toString(16)}`,
      chainId: `0x${chainId.toString(16)}`,
    };
  }

  return {
    from,
    to: token.address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipient, parseUnits(amount, token.decimals)],
    }),
    value: '0x0',
    chainId: `0x${chainId.toString(16)}`,
  };
}

function getExplorerUrl(chainId, hash) {
  if (chainId === 1) return `https://etherscan.io/tx/${hash}`;
  if (chainId === 56) return `https://bscscan.com/tx/${hash}`;
  return `https://basescan.org/tx/${hash}`;
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 10,
    fontFamily: Fonts.sansBd,
    color: Colors.muted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  choiceGrid: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  choiceBtn: {
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 2,
    borderTopColor: Colors.border2,
    padding: Spacing.md,
  },
  choiceBtnActive: {
    borderColor: Colors.kola,
    backgroundColor: 'rgba(192,57,43,0.08)',
  },
  choiceTitle: {
    color: Colors.text,
    fontFamily: Fonts.sansBd,
    fontSize: 13,
  },
  choiceSub: {
    color: Colors.muted,
    fontFamily: Fonts.mono,
    fontSize: 10,
    marginTop: 2,
  },
  choiceMeta: {
    color: Colors.gold2,
    fontFamily: Fonts.monoBd,
    fontSize: 11,
    marginTop: 6,
  },
  field: {
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  hint: {
    color: Colors.muted,
    fontFamily: Fonts.mono,
    fontSize: 10,
    marginBottom: Spacing.md,
  },
  infoBox: {
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    color: Colors.text,
    fontFamily: Fonts.sansBd,
    fontSize: 12,
    marginBottom: 4,
  },
  infoBody: {
    color: Colors.muted,
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 16,
  },
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
  reviewCard: {
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,53,32,0.4)',
  },
  reviewLabel: {
    color: Colors.muted,
    fontFamily: Fonts.sans,
    fontSize: 11,
  },
  reviewValue: {
    color: Colors.text2,
    fontFamily: Fonts.mono,
    fontSize: 11,
    maxWidth: '62%',
    textAlign: 'right',
  },
  reviewValueHighlight: {
    color: Colors.text,
    fontFamily: Fonts.monoBd,
  },
  cta: {
    backgroundColor: Colors.gold,
    padding: 13,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaTxt: {
    fontFamily: Fonts.sansBd,
    fontSize: 13,
    color: Colors.earth,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ctaOutline: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 11,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaOutlineTxt: {
    fontFamily: Fonts.sansBd,
    fontSize: 12,
    color: Colors.text2,
  },
  hashBox: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: Colors.clay,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  hashLbl: {
    fontSize: 9,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  hashVal: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.kola,
  },
});
