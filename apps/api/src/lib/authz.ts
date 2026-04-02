import { getAddress } from 'viem'

export function getAuthorizedWalletAddress(authWalletAddress?: string | null, requestedWalletAddress?: string) {
  const authWallet = authWalletAddress ? getAddress(authWalletAddress) : null
  const requested = requestedWalletAddress ? getAddress(requestedWalletAddress) : null

  if (!authWallet) {
    throw new Error('Authenticated wallet address is missing from the session.')
  }
  if (requested && requested !== authWallet) {
    throw new Error('Requested wallet does not match the authenticated wallet.')
  }

  return requested ?? authWallet
}

export function resolveAuthorizedWalletAddress(options: {
  authWalletAddress?: string | null
  persistedWalletAddress?: string | null
  requestedWalletAddress?: string
  allowRequestedWithoutSessionWallet?: boolean
}) {
  const authWallet = options.authWalletAddress ? getAddress(options.authWalletAddress) : null
  const persistedWallet = options.persistedWalletAddress ? getAddress(options.persistedWalletAddress) : null
  const requested = options.requestedWalletAddress ? getAddress(options.requestedWalletAddress) : null
  const trustedWallet = authWallet ?? persistedWallet

  if (trustedWallet) {
    if (requested && requested !== trustedWallet) {
      throw new Error('Requested wallet does not match the authenticated wallet.')
    }
    return requested ?? trustedWallet
  }

  if (options.allowRequestedWithoutSessionWallet && requested) {
    return requested
  }

  throw new Error('Authenticated wallet address is missing from the session.')
}

export function isAuthorizationError(err: Error) {
  return (
    err.message.includes('Authenticated wallet address is missing') ||
    err.message.includes('Requested wallet does not match')
  )
}
