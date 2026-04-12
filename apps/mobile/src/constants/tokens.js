// src/constants/tokens.js

export const TOKENS = [
  {
    sym: 'USDC', icon: '$', name: 'USD Coin',
    price: 1, bal: '8,420.00', value: '$8,420.00',
    chain: 'Base', change24h: '+0.01%', changePos: true,
    color: '39,174,96',
    about: 'USD Coin is a fully-reserved stablecoin pegged 1:1 to the US dollar, issued by Circle on Base.',
    contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    allocation: '33.9%',
    amount: '8,420.00 USDC',
    txs: [
      { type: 'in',  label: 'Received from Aerodrome', hash: '0x4f2a…c391', amt: '+120.00 USDC', time: '2h ago' },
      { type: 'out', label: 'Sent to 0x9fA…3c2',      hash: '0x8b1d…f204', amt: '-500.00 USDC', time: '1d ago' },
    ],
  },
  {
    sym: 'ETH', icon: 'E', name: 'Ethereum',
    price: 3291.5, bal: '2.847', value: '$9,371.40',
    chain: 'Base', change24h: '+2.14%', changePos: true,
    color: '98,126,234',
    about: 'Ethereum is the native asset of the Ethereum L1, bridged to Base as wrapped ETH.',
    contract: '0x4200000000000000000000000000000000000006',
    allocation: '37.7%',
    amount: '2.847 ETH',
    txs: [
      { type: 'in',  label: 'Bridge from Ethereum',    hash: '0x3e9f…b812', amt: '+1.000 ETH',  time: '3d ago' },
      { type: 'out', label: 'Swap to USDC',            hash: '0x7c4a…d509', amt: '-0.500 ETH',  time: '5d ago' },
    ],
  },
  {
    sym: 'WBTC', icon: '₿', name: 'Wrapped Bitcoin',
    price: 97400, bal: '0.0041', value: '$399.34',
    chain: 'Base', change24h: '+3.82%', changePos: true,
    color: '242,169,0',
    about: 'Wrapped Bitcoin is an ERC-20 token backed 1:1 by real Bitcoin, enabling BTC liquidity on Base.',
    contract: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9',
    allocation: '1.6%',
    amount: '0.0041 WBTC',
    txs: [
      { type: 'in', label: 'Bought via Uniswap', hash: '0x1a8c…e740', amt: '+0.0041 WBTC', time: '1w ago' },
    ],
  },
  {
    sym: 'AERO', icon: 'A', name: 'Aerodrome Finance',
    price: 0.519, bal: '14,208', value: '$7,373.95',
    chain: 'Base', change24h: '-1.23%', changePos: false,
    color: '255,0,122',
    about: 'Aerodrome is the leading DEX and liquidity layer on Base, functioning as a ve(3,3) AMM.',
    contract: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    allocation: '29.7%',
    amount: '14,208 AERO',
    txs: [
      { type: 'in',  label: 'LP rewards claimed', hash: '0x2b3d…7f81', amt: '+4.2 AERO',    time: '22m ago' },
      { type: 'in',  label: 'LP rewards claimed', hash: '0x9e7f…c104', amt: '+9.1 AERO',    time: '2d ago'  },
    ],
  },
];

export const ONRAMP_TOKENS = [
  { sym: 'USDC',  icon: '$', price: 1,      name: 'USD Coin',        desc: 'Stablecoin · Pegged to USD' },
  { sym: 'ETH',   icon: 'E', price: 3291.5, name: 'Ethereum',        desc: 'L1 native asset' },
  { sym: 'WBTC',  icon: '₿', price: 97400,  name: 'Wrapped Bitcoin', desc: 'BTC on Base' },
  { sym: 'CBBTC', icon: '₿', price: 97400,  name: 'Coinbase BTC',    desc: 'cbBTC · Base native' },
];
