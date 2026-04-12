import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import SheetModal from '../common/SheetModal';
import CurrencyPicker from './CurrencyPicker';
import TokenPicker from './TokenPicker';
import { ProcessingScreen, SuccessScreen } from '../common/ProcessingScreen';
import { useSheets } from '../../hooks/useSheets';
import { useOnramp } from '../../hooks/useOnramp';
import { useAuth } from '../../lib/auth';
import { apiPost } from '../../lib/api';
import { shortAddress } from '../../lib/wallet';
import { useWalletStore } from '../../store/wallet';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const METHODS = [
  { key: 'card', icon: '💳', label: 'Card' },
  { key: 'bank', icon: '🏦', label: 'Bank' },
  { key: 'ussd', icon: '📱', label: 'USSD' },
];

const PROCESSING_STEPS = [
  { label: 'Validating funding request' },
  { label: 'Creating hosted checkout session' },
  { label: 'Opening secure checkout' },
];

export default function OnrampSheet() {
  const { isOpen, closeSheet } = useSheets();
  const { identityToken, walletAddress } = useAuth();
  const addOnrampAttempt = useWalletStore((state) => state.addOnrampAttempt);
  const updateOnrampAttempt = useWalletStore((state) => state.updateOnrampAttempt);
  const onramp = useOnramp();

  const [screen, setScreen] = useState('input');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [procSteps, setProcSteps] = useState(PROCESSING_STEPS.map((step) => ({ ...step, status: 'idle' })));
  const [orderRef, setOrderRef] = useState('');
  const [providerName, setProviderName] = useState('');
  const [sheetError, setSheetError] = useState(null);

  const sheetTitle =
    screen === 'input' ? 'Buy Crypto' :
    screen === 'processing' ? 'Processing…' : 'Funding Session Ready';

  const handleBuy = async () => {
    if (!identityToken || !walletAddress || !onramp.chainId) {
      setSheetError('Your wallet session is not ready yet.');
      return;
    }

    setSheetError(null);
    setScreen('processing');
    setProcSteps(PROCESSING_STEPS.map((step, index) => ({
      ...step,
      status: index === 0 ? 'active' : 'idle',
    })));

    try {
      const targetWalletAddress = onramp.destMode === 'external' ? onramp.destAddr : walletAddress;
      const attemptId = `onramp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      setProcSteps((prev) => prev.map((step, index) => ({
        ...step,
        status: index === 0 ? 'done' : index === 1 ? 'active' : 'idle',
      })));

      const session = await apiPost('/api/onramp/session', {
        walletAddress: targetWalletAddress,
        chainId: onramp.chainId,
        asset: onramp.token.sym,
        fiatCurrency: onramp.currency.code,
        fiatAmount: Number.parseFloat(onramp.fiatAmt),
      }, {
        token: identityToken,
      });

      addOnrampAttempt({
        id: attemptId,
        provider: session.provider,
        walletAddress: targetWalletAddress,
        chainId: session.chainId,
        asset: session.asset,
        fiatCurrency: session.fiatCurrency,
        fiatAmount: session.fiatAmount,
        status: 'opening',
        widgetUrl: session.widgetUrl ?? null,
        method: 'hosted',
        createdAt: Date.now(),
      });

      setProcSteps((prev) => prev.map((step, index) => ({
        ...step,
        status: index <= 1 ? 'done' : 'active',
      })));

      await WebBrowser.openBrowserAsync(session.widgetUrl);

      updateOnrampAttempt(attemptId, {
        status: 'awaiting_settlement',
      });

      setProcSteps((prev) => prev.map((step) => ({ ...step, status: 'done' })));
      setOrderRef(attemptId.toUpperCase());
      setProviderName(String(session.provider ?? 'transak').toUpperCase());
      setScreen('success');
    } catch (error) {
      setSheetError(error instanceof Error ? error.message : 'Unable to create funding session.');
      setProcSteps(PROCESSING_STEPS.map((step) => ({ ...step, status: 'idle' })));
      setScreen('input');
    }
  };

  const handleClose = () => {
    closeSheet();
    setTimeout(() => {
      setScreen('input');
      setOrderRef('');
      setProviderName('');
      setSheetError(null);
      onramp.reset();
      setProcSteps(PROCESSING_STEPS.map((step) => ({ ...step, status: 'idle' })));
    }, 400);
  };

  return (
    <>
      <SheetModal
        isOpen={isOpen('onramp')}
        onClose={handleClose}
        title={sheetTitle}
        snapPoints={['90%']}
        scrollable={screen === 'input'}
      >
        {screen === 'input' && (
          <InputScreen
            onramp={onramp}
            onOpenCurrency={() => setShowCurrencyPicker(true)}
            onOpenToken={() => setShowTokenPicker(true)}
            onBuy={handleBuy}
            error={sheetError}
            walletAddress={walletAddress}
          />
        )}
        {screen === 'processing' && (
          <ProcessingScreen
            title="Opening Checkout…"
            subtitle={"Your funding request is being prepared\nfor the hosted checkout provider."}
            steps={procSteps}
            accentColor={Colors.purple}
          />
        )}
        {screen === 'success' && (
          <SuccessScreen
            title="Funding Session Ready"
            subtitle={`${onramp.cryptoAmt} ${onramp.token.sym} prepared for ${onramp.currency.symbol}${parseFloat(onramp.fiatAmt || 0).toLocaleString()} ${onramp.currency.code}`}
            accentColor={Colors.purple}
          >
            <View style={styles.orderRef}>
              <Text style={styles.orderRefLbl}>Session Reference</Text>
              <Text style={styles.orderRefVal}>{orderRef}</Text>
            </View>
            <View style={styles.destBox}>
              <Text style={styles.destBoxLbl}>Checkout Provider</Text>
              <Text style={styles.destBoxVal}>{providerName || 'HOSTED CHECKOUT'}</Text>
            </View>
            <View style={styles.destBox}>
              <Text style={styles.destBoxLbl}>Destination Wallet</Text>
              <Text style={styles.destBoxVal}>
                {onramp.destMode === 'self'
                  ? `${shortAddress(walletAddress)} · ${chainLabel(onramp.chainId)}`
                  : `${shortAddress(onramp.destAddr)} · External`}
              </Text>
            </View>
            <TouchableOpacity style={[styles.cta, { backgroundColor: Colors.purple }]} onPress={handleClose}>
              <Text style={styles.ctaTxt}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaOutline} onPress={() => {
              setScreen('input');
              setOrderRef('');
              setProviderName('');
              setSheetError(null);
              onramp.reset();
              setProcSteps(PROCESSING_STEPS.map((step) => ({ ...step, status: 'idle' })));
            }}>
              <Text style={styles.ctaOutlineTxt}>Open Another Session</Text>
            </TouchableOpacity>
          </SuccessScreen>
        )}
      </SheetModal>

      <CurrencyPicker
        visible={showCurrencyPicker}
        selected={onramp.currency}
        onSelect={(currency) => { onramp.setCurrency(currency); setShowCurrencyPicker(false); }}
        onClose={() => setShowCurrencyPicker(false)}
      />
      <TokenPicker
        visible={showTokenPicker}
        selected={onramp.token}
        onSelect={(token) => { onramp.setToken(token); setShowTokenPicker(false); }}
        onClose={() => setShowTokenPicker(false)}
      />
    </>
  );
}

function InputScreen({ onramp, onOpenCurrency, onOpenToken, onBuy, error, walletAddress }) {
  const {
    currency,
    token,
    method,
    setMethod,
    fiatAmt,
    cryptoAmt,
    usdEq,
    quote,
    calcQuote,
    destMode,
    setDestMode,
    destAddr,
    addrStatus,
    validateAddress,
    canBuy,
    chainId,
    supportedChains,
    unsupportedReason,
  } = onramp;

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.fieldLabel}>You Pay</Text>
      <View style={styles.fiatRow}>
        <TouchableOpacity style={styles.currencyBtn} onPress={onOpenCurrency}>
          <Text style={styles.currencyFlag}>{currency.flag}</Text>
          <Text style={styles.currencyCode}>{currency.code}</Text>
          <Text style={styles.arrow}>▾</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.amtInput}
          placeholder="0.00"
          placeholderTextColor={Colors.muted2}
          keyboardType="decimal-pad"
          value={fiatAmt}
          onChangeText={calcQuote}
        />
      </View>
      <Text style={styles.usdEq}>{usdEq}</Text>

      <Text style={styles.fieldLabel}>You Receive</Text>
      <View style={styles.fiatRow}>
        <TouchableOpacity style={styles.currencyBtn} onPress={onOpenToken}>
          <Text style={styles.currencyCode}>{token.icon}  {token.sym}</Text>
          <Text style={styles.arrow}>▾</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.amtInput, { color: Colors.green }]}
          placeholder="0.00"
          placeholderTextColor={Colors.muted2}
          editable={false}
          value={cryptoAmt}
        />
      </View>
      <Text style={[styles.usdEq, { marginBottom: 6 }]}>on {chainLabel(chainId)}</Text>
      {supportedChains.length > 1 ? (
        <Text style={[styles.usdEq, { marginBottom: Spacing.lg }]}>
          Available on {supportedChains.map((id) => chainLabel(id)).join(', ')}
        </Text>
      ) : (
        <Text style={[styles.usdEq, { marginBottom: Spacing.lg }]}>Single-chain checkout asset</Text>
      )}

      <Text style={styles.fieldLabel}>Payment Method</Text>
      <View style={styles.methodGrid}>
        {METHODS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.methodBtn, method === item.key && styles.methodBtnActive]}
            onPress={() => setMethod(item.key)}
          >
            <Text style={styles.methodIcon}>{item.icon}</Text>
            <Text style={[styles.methodLbl, method === item.key && { color: '#C39BD3' }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {quote ? (
        <View style={styles.quoteBox}>
          <Text style={styles.quoteRate}>{quote.rate}</Text>
          <Text style={styles.quoteYou}>{quote.youReceive}</Text>
          <Text style={styles.quoteSub}>{quote.fee}</Text>
          <View style={styles.providerRow}>
            <View style={styles.providerBest}><Text style={styles.providerBestTxt}>{quote.providers.best}</Text></View>
            {quote.providers.others.map((provider) => (
              <View key={provider} style={styles.provider}><Text style={styles.providerTxt}>{provider}</Text></View>
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.quoteBox, { opacity: 0.4 }]}>
          <Text style={styles.quoteRate}>Enter amount to see quote</Text>
        </View>
      )}

      {unsupportedReason ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{unsupportedReason}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>Destination Wallet</Text>
      <View style={styles.destHeader}>
        <TouchableOpacity
          style={styles.extToggle}
          onPress={() => setDestMode(destMode === 'self' ? 'external' : 'self')}
        >
          <Text style={styles.extToggleTxt}>
            {destMode === 'self' ? '+ External' : '← My Wallet'}
          </Text>
        </TouchableOpacity>
      </View>

      {destMode === 'self' ? (
        <View style={styles.selfWallet}>
          <View style={styles.selfDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.selfName}>My Amara Wallet</Text>
            <Text style={styles.selfAddr}>
              {walletAddress ? `${shortAddress(walletAddress)} · ${chainLabel(chainId)}` : 'Wallet loading…'}
            </Text>
          </View>
          <Text style={styles.defaultBadge}>DEFAULT</Text>
        </View>
      ) : (
        <View style={styles.externalWrap}>
          <TextInput
            style={styles.addrInput}
            placeholder="0x… or ENS name"
            placeholderTextColor={Colors.muted2}
            value={destAddr}
            onChangeText={validateAddress}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {addrStatus === 'valid' && (
            <Text style={[styles.addrHint, { color: Colors.green }]}>✓ Valid address</Text>
          )}
          {addrStatus === 'resolving' && (
            <Text style={[styles.addrHint, { color: Colors.gold2 }]}>⟳ Resolving ENS…</Text>
          )}
          {addrStatus === 'invalid' && (
            <Text style={[styles.addrHint, { color: Colors.kola }]}>✕ Invalid address format</Text>
          )}
          <Text style={styles.addrWarning}>
            ⚠ Double-check the address. Crypto sent to wrong addresses cannot be recovered.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.cta, !canBuy && { opacity: 0.4 }]}
        onPress={() => { void onBuy(); }}
        disabled={!canBuy}
      >
        <Text style={styles.ctaTxt}>
          {canBuy ? `Buy ${cryptoAmt} ${token.sym} →` : 'Buy Now →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function chainLabel(chainId) {
  switch (chainId) {
    case 1:
      return 'Ethereum';
    case 56:
      return 'BNB Chain';
    case 8453:
    default:
      return 'Base';
  }
}

const styles = StyleSheet.create({
  inputWrap: { gap: 0 },
  fieldLabel: {
    fontSize: 10, fontFamily: Fonts.sansBd,
    color: Colors.muted, letterSpacing: 1.6,
    textTransform: 'uppercase', marginBottom: 6,
  },
  fiatRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  currencyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  currencyFlag: { fontSize: 16 },
  currencyCode: { fontFamily: Fonts.monoBd, fontSize: 12, color: Colors.text },
  arrow: { fontSize: 9, color: Colors.muted },
  amtInput: {
    flex: 1, backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, fontSize: 18, fontFamily: Fonts.monoBd, color: Colors.text,
  },
  usdEq: { fontSize: 11, fontFamily: Fonts.mono, color: Colors.muted, marginBottom: Spacing.md },
  methodGrid: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  methodBtn: {
    flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12,
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
  },
  methodBtnActive: { borderColor: Colors.purple, backgroundColor: 'rgba(155,89,182,0.1)' },
  methodIcon: { fontSize: 18 },
  methodLbl: { fontSize: 9, fontFamily: Fonts.sansBd, letterSpacing: 0.8, textTransform: 'uppercase', color: Colors.text2 },
  quoteBox: {
    backgroundColor: 'rgba(155,89,182,0.07)',
    borderWidth: 1, borderColor: 'rgba(155,89,182,0.2)',
    borderLeftWidth: 3, borderLeftColor: Colors.purple,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  quoteRate: { fontSize: 13, fontFamily: Fonts.monoBd, color: Colors.text },
  quoteYou: { fontSize: 11, fontFamily: Fonts.monoBd, color: Colors.gold2, marginTop: 4 },
  quoteSub: { fontSize: 10, color: Colors.muted, marginTop: 3 },
  providerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  providerBest: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.purple,
    backgroundColor: 'rgba(155,89,182,0.14)',
  },
  providerBestTxt: { fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.purple },
  provider: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(155,89,182,0.3)',
    backgroundColor: 'rgba(155,89,182,0.08)',
  },
  providerTxt: { fontSize: 9, fontFamily: Fonts.sansBd, color: '#C39BD3' },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.25)',
    backgroundColor: 'rgba(192,57,43,0.08)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.kola,
    fontFamily: Fonts.sansMd,
    fontSize: 11,
    lineHeight: 16,
  },
  destHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  extToggle: {
    paddingHorizontal: 9, paddingVertical: 3,
    backgroundColor: 'rgba(212,146,10,0.08)',
    borderWidth: 1, borderColor: 'rgba(212,146,10,0.25)',
  },
  extToggleTxt: { fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.gold2, textTransform: 'uppercase', letterSpacing: 1 },
  selfWallet: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: Spacing.md, backgroundColor: Colors.clay,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  selfDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  selfName: { fontSize: 11, fontFamily: Fonts.sansBd, color: Colors.text },
  selfAddr: { fontSize: 9, fontFamily: Fonts.mono, color: Colors.muted, marginTop: 2 },
  defaultBadge: { fontSize: 9, fontFamily: Fonts.sansBd, color: Colors.green, letterSpacing: 0.8 },
  externalWrap: { marginBottom: Spacing.lg, gap: 6 },
  addrInput: {
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 12, fontFamily: Fonts.mono, color: Colors.text,
  },
  addrHint: { fontSize: 10, fontFamily: Fonts.mono },
  addrWarning: { fontSize: 10, color: Colors.muted, lineHeight: 15 },
  cta: {
    backgroundColor: Colors.gold, padding: 13, alignItems: 'center', marginTop: Spacing.lg,
  },
  ctaTxt: { fontFamily: Fonts.sansBd, fontSize: 13, color: Colors.earth, textTransform: 'uppercase', letterSpacing: 1 },
  ctaOutline: {
    borderWidth: 1, borderColor: Colors.border, padding: 11, alignItems: 'center', marginTop: 8,
  },
  ctaOutlineTxt: { fontFamily: Fonts.sansBd, fontSize: 12, color: Colors.text2 },
  orderRef: {
    width: '100%', padding: Spacing.md,
    backgroundColor: Colors.clay, borderWidth: 1, borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  orderRefLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  orderRefVal: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.gold2 },
  destBox: {
    width: '100%', padding: Spacing.md,
    backgroundColor: 'rgba(155,89,182,0.07)',
    borderWidth: 1, borderColor: 'rgba(155,89,182,0.2)',
    marginTop: 8, marginBottom: Spacing.lg,
  },
  destBoxLbl: { fontSize: 9, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  destBoxVal: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.text2 },
});
