// src/constants/currencies.js

export const ONRAMP_CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira',      flag: '🇳🇬', rate: 1640,  symbol: '₦'   },
  { code: 'USD', name: 'US Dollar',           flag: '🇺🇸', rate: 1,     symbol: '$'   },
  { code: 'GBP', name: 'British Pound',       flag: '🇬🇧', rate: 0.79,  symbol: '£'   },
  { code: 'EUR', name: 'Euro',                flag: '🇪🇺', rate: 0.91,  symbol: '€'   },
  { code: 'GHS', name: 'Ghanaian Cedi',       flag: '🇬🇭', rate: 15.2,  symbol: '₵'   },
  { code: 'KES', name: 'Kenyan Shilling',     flag: '🇰🇪', rate: 130,   symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand',  flag: '🇿🇦', rate: 18.4,  symbol: 'R'   },
  { code: 'XOF', name: 'West African CFA',    flag: '🌍',  rate: 598,   symbol: 'CFA' },
];

export const ONRAMP_PROVIDERS = {
  card: { best: 'MoonPay',      others: ['Transak', 'Onramper'],       fee: 0.049, time: 'Instant' },
  bank: { best: 'Transak',      others: ['MoonPay', 'Flutterwave'],    fee: 0.015, time: '~5 min'  },
  ussd: { best: 'Flutterwave',  others: ['Paystack', 'Interswitch'],   fee: 0.025, time: '~2 min'  },
};
