export const MOBILE_CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  privyAppId: process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? '',
};

export function hasRequiredMobileConfig() {
  return Boolean(MOBILE_CONFIG.privyAppId);
}
