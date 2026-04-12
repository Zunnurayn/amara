// src/hooks/useOnramp.js

import { useState, useCallback, useEffect } from 'react';
import { ONRAMP_CURRENCIES, ONRAMP_PROVIDERS } from '../constants/currencies';
import { ONRAMP_TOKENS } from '../constants/tokens';

const DEFAULT_CURRENCY = ONRAMP_CURRENCIES[0]; // NGN
const DEFAULT_TOKEN    = ONRAMP_TOKENS[0];      // USDC
const DEFAULT_METHOD   = 'card';

export function useOnramp() {
  const [currency,     setCurrency]     = useState(DEFAULT_CURRENCY);
  const [token,        setToken]        = useState(DEFAULT_TOKEN);
  const [method,       setMethod]       = useState(DEFAULT_METHOD);
  const [fiatAmt,      setFiatAmt]      = useState('');
  const [cryptoAmt,    setCryptoAmt]    = useState('');
  const [usdEq,        setUsdEq]        = useState('≈ $0.00 USD');
  const [quote,        setQuote]        = useState(null);      // { rate, youReceive, fee, time }
  const [destMode,     setDestMode]     = useState('self');    // 'self' | 'external'
  const [destAddr,     setDestAddr]     = useState('');
  const [addrStatus,   setAddrStatus]   = useState(null);      // null | 'valid' | 'invalid' | 'resolving'
  const [chainId,      setChainId]      = useState(getDefaultChainIdForToken(DEFAULT_TOKEN.sym));

  const provider = ONRAMP_PROVIDERS[method];
  const supportedChains = getSupportedChainIdsForToken(token.sym);
  const supportedFiatCodes = ['NGN', 'USD'];
  const isSupportedFiat = supportedFiatCodes.includes(currency.code);
  const activeChainId = supportedChains.includes(chainId) ? chainId : supportedChains[0];

  const calcQuote = useCallback((rawFiat) => {
    const fiat = parseFloat(rawFiat) || 0;
    setFiatAmt(rawFiat);

    if (fiat <= 0) {
      setCryptoAmt('');
      setUsdEq('≈ $0.00 USD');
      setQuote(null);
      return;
    }

    const usd     = fiat / currency.rate;
    const fee     = usd * provider.fee;
    const netUsd  = usd - fee;
    const crypto  = netUsd / token.price;

    const cryptoDisplay =
      crypto < 0.00001 ? crypto.toFixed(8) :
      crypto < 0.01    ? crypto.toFixed(6) :
      crypto < 1       ? crypto.toFixed(5) : crypto.toFixed(4);

    setCryptoAmt(cryptoDisplay);
    setUsdEq(`≈ $${usd.toFixed(2)} USD`);
    setQuote({
      rate:       `1 ${token.sym} = ${currency.symbol}${(token.price * currency.rate).toLocaleString()}`,
      youReceive: `You receive: ${cryptoDisplay} ${token.sym}`,
      fee:        `Fee: ${(provider.fee * 100).toFixed(1)}% · Time: ${provider.time} · Rate locked 30s`,
      providers:  { best: provider.best, others: provider.others },
    });
  }, [currency, token, method, provider]);

  const selectToken = useCallback((nextToken) => {
    setToken(nextToken);
    const nextSupportedChains = getSupportedChainIdsForToken(nextToken.sym);
    if (!nextSupportedChains.includes(chainId)) {
      setChainId(nextSupportedChains[0]);
    }
  }, [chainId]);

  const selectCurrency = useCallback((nextCurrency) => {
    setCurrency(nextCurrency);
  }, []);

  const validateAddress = useCallback((addr) => {
    setDestAddr(addr);
    if (!addr) { setAddrStatus(null); return; }

    const isEth = /^0x[0-9a-fA-F]{40}$/.test(addr);
    const isENS = /^[a-zA-Z0-9-]+\.eth$/.test(addr);

    if (isEth) {
      setAddrStatus('valid');
    } else if (isENS) {
      setAddrStatus('resolving');
      setTimeout(() => setAddrStatus('valid'), 800);
    } else {
      setAddrStatus('invalid');
    }
  }, []);

  const reset = useCallback(() => {
    setCurrency(DEFAULT_CURRENCY);
    setToken(DEFAULT_TOKEN);
    setMethod(DEFAULT_METHOD);
    setFiatAmt('');
    setCryptoAmt('');
    setUsdEq('≈ $0.00 USD');
    setQuote(null);
    setDestMode('self');
    setDestAddr('');
    setAddrStatus(null);
    setChainId(getDefaultChainIdForToken(DEFAULT_TOKEN.sym));
  }, []);

  useEffect(() => {
    if (!fiatAmt) return;
    calcQuote(fiatAmt);
  }, [calcQuote, fiatAmt]);

  const canBuy = (() => {
    if (!cryptoAmt || parseFloat(cryptoAmt) <= 0) return false;
    if (!isSupportedFiat) return false;
    if (!activeChainId) return false;
    if (destMode === 'external') return false;
    return true;
  })();

  const unsupportedReason = destMode === 'external'
    ? 'Hosted checkout can only fund the authenticated Amara wallet right now.'
    : !isSupportedFiat
      ? `${currency.code} is not supported for hosted checkout right now.`
      : !activeChainId
        ? `${token.sym} is not supported for on-ramp right now.`
        : null;

  return {
    // state
    currency, setCurrency: selectCurrency,
    token, setToken: selectToken,
    method, setMethod,
    fiatAmt, cryptoAmt,
    usdEq, quote,
    destMode, setDestMode,
    destAddr, addrStatus,
    chainId: activeChainId,
    supportedChains,
    supportedFiatCodes,
    unsupportedReason,
    canBuy,
    // actions
    calcQuote,
    validateAddress,
    reset,
  };
}

function getSupportedChainIdsForToken(symbol) {
  switch (symbol) {
    case 'USDC':
      return [8453, 1, 56];
    case 'ETH':
      return [8453, 1];
    case 'USDT':
      return [56];
    case 'BNB':
      return [56];
    default:
      return [];
  }
}

function getDefaultChainIdForToken(symbol) {
  return getSupportedChainIdsForToken(symbol)[0] ?? 8453;
}
