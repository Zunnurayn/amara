const CHAIN_META = {
  1: { name: 'Ethereum', shortName: 'Ethereum', color: '#627EEA', label: 'L1 · Mainnet' },
  56: { name: 'BNB Chain', shortName: 'BNB', color: '#F3BA2F', label: 'L1 · Binance' },
  8453: { name: 'Base', shortName: 'Base', color: '#1C6EFF', label: 'L2 · Coinbase' },
};

export function resolveWalletIdentity(user) {
  const directWalletAddress = firstAddress([
    user?.wallet?.address,
    user?.smartWallet?.address,
    user?.wallets?.[0]?.address,
  ]);

  const linkedAccounts = user?.linkedAccounts ?? user?.linked_accounts ?? [];
  const walletAccount = linkedAccounts.find((account) => {
    const type = String(account?.type ?? '').toLowerCase();
    return (
      type === 'wallet' ||
      type === 'smart_wallet' ||
      type === 'embedded_wallet' ||
      type.includes('wallet')
    );
  });

  const address = firstAddress([
    directWalletAddress,
    walletAccount?.address,
    walletAccount?.walletClient?.address,
    walletAccount?.wallet_client?.address,
    walletAccount?.account?.address,
  ]);

  return {
    address,
    hasWallet: Boolean(address),
  };
}

export function firstAddress(candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^0x[a-fA-F0-9]{40}$/.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function shortAddress(address) {
  if (!address) return 'No wallet';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function parseUsdAmount(value) {
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/[$,]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUsd(value) {
  if (!Number.isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '0.00%';
  const abs = Math.abs(value).toFixed(2);
  return `${value >= 0 ? '+' : '-'}${abs}%`;
}

export function chainMetaFromId(chainId) {
  return CHAIN_META[chainId] ?? {
    name: `Chain ${chainId}`,
    shortName: `#${chainId}`,
    color: '#7A5E3A',
    label: 'Unsupported',
  };
}

export function chainNameFromId(chainId) {
  return chainMetaFromId(chainId).name;
}

export function chainColorFromId(chainId) {
  return chainMetaFromId(chainId).color;
}

export function assetIcon(symbol) {
  if (!symbol) return '•';
  return String(symbol).charAt(0).toUpperCase();
}

export function formatRelativeTime(timestamp) {
  const deltaMs = Date.now() - timestamp;
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return 'just now';
  const minutes = Math.floor(deltaMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function derivePortfolioChangePercent(totalUsd, changeUsd) {
  const total = parseUsdAmount(totalUsd);
  const change = parseUsdAmount(changeUsd);
  const previous = total - change;
  if (!previous) return 0;
  return (change / previous) * 100;
}
