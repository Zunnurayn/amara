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

export function isAuthorizationError(err: Error) {
  return (
    err.message.includes('Authenticated wallet address is missing') ||
    err.message.includes('Requested wallet does not match')
  )
}
