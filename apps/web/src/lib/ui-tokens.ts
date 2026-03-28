export const colors = {
  earth: '#1A1208',
  soil: '#221A0E',
  clay: '#2E2010',
  clay2: '#3A2A14',
  border: '#4A3520',
  border2: '#6A5030',
  gold: '#D4920A',
  gold2: '#F0B429',
  kola: '#C0392B',
  kola2: '#E74C3C',
  turmeric: '#E8A020',
  green: '#2ECC71',
  teal: '#48C9B0',
  red: '#C0392B',
  text: '#F5E6C8',
  text2: '#C8AA7A',
  muted: '#7A5E3A',
  muted2: '#5A4228',
  chains: {
    base: '#1C6EFF',
    eth: '#627EEA',
    arb: '#28A0F0',
    op: '#FF0420',
    bnb: '#F3BA2F',
    poly: '#8247E5',
    avax: '#E84142',
    sol: '#9945FF',
    zk: '#7B61FF',
    linea: '#61DAFB',
  },
  logo: {
    blue: '#3B5BDB',
    purple: '#7B3FB5',
    gold: '#F0A500',
    black: '#1A1208',
  },
} as const

export const shadows = {
  gold: '0 4px 20px rgba(212,146,10,0.4)',
  dark: '0 8px 32px rgba(0,0,0,0.6)',
  glow: '0 0 40px rgba(212,146,10,0.1)',
} as const

export const chainMeta: Record<number, {
  name: string
  shortName: string
  color: string
  layer: 'L1' | 'L2'
  explorerUrl: string
}> = {
  8453: { name: 'Base', shortName: 'BASE', color: colors.chains.base, layer: 'L2', explorerUrl: 'https://basescan.org' },
  1: { name: 'Ethereum', shortName: 'ETH', color: colors.chains.eth, layer: 'L1', explorerUrl: 'https://etherscan.io' },
  42161: { name: 'Arbitrum', shortName: 'ARB', color: colors.chains.arb, layer: 'L2', explorerUrl: 'https://arbiscan.io' },
  10: { name: 'Optimism', shortName: 'OP', color: colors.chains.op, layer: 'L2', explorerUrl: 'https://optimistic.etherscan.io' },
  56: { name: 'BNB Chain', shortName: 'BNB', color: colors.chains.bnb, layer: 'L1', explorerUrl: 'https://bscscan.com' },
  137: { name: 'Polygon', shortName: 'MATIC', color: colors.chains.poly, layer: 'L2', explorerUrl: 'https://polygonscan.com' },
  43114: { name: 'Avalanche', shortName: 'AVAX', color: colors.chains.avax, layer: 'L1', explorerUrl: 'https://snowtrace.io' },
  324: { name: 'zkSync', shortName: 'ZK', color: colors.chains.zk, layer: 'L2', explorerUrl: 'https://explorer.zksync.io' },
  59144: { name: 'Linea', shortName: 'LINEA', color: colors.chains.linea, layer: 'L2', explorerUrl: 'https://lineascan.build' },
}
