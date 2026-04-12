// ─────────────────────────────────────────
// src/constants/theme.js
// Anara Wallet — design tokens
// ─────────────────────────────────────────

export const Colors = {
  // Backgrounds
  earth:   '#1A1208',   // deepest bg
  soil:    '#221A0E',   // card bg
  clay:    '#2E2010',   // input bg
  clay2:   '#3A2A14',   // elevated surface

  // Borders
  border:  '#4A3520',
  border2: '#6A5030',

  // Brand accents
  gold:      '#D4920A',
  gold2:     '#F0B429',
  kola:      '#C0392B',   // red / danger
  turmeric:  '#E8A020',   // amber

  // Status
  green:   '#2ECC71',
  teal:    '#48C9B0',
  purple:  '#9B59B6',   // onramp accent

  // Text
  text:    '#F5E6C8',   // primary
  text2:   '#C8AA7A',   // secondary
  muted:   '#7A5E3A',
  muted2:  '#5A4228',

  // Chain colours
  base:    '#1C6EFF',
  ethereum:'#627EEA',
  arbitrum:'#28A0F0',
  optimism:'#FF0420',
};

export const Fonts = {
  serif:  'PlayfairDisplay-Black',   // headings
  sans:   'DMSans-Regular',
  sansMd: 'DMSans-Medium',
  sansSb: 'DMSans-SemiBold',
  sansBd: 'DMSans-Bold',
  mono:   'SpaceMono-Regular',
  monoBd: 'SpaceMono-Bold',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
};

// Kente strip colour sequence (used in KenteStrip component)
export const KENTE = [
  Colors.gold,
  Colors.kola,
  Colors.earth,
  Colors.turmeric,
  Colors.earth,
  Colors.teal,
  Colors.earth,
];
