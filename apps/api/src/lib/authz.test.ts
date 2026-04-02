import { describe, expect, it } from 'vitest'
import { getAuthorizedWalletAddress, isAuthorizationError, resolveAuthorizedWalletAddress } from './authz'

describe('authz helpers', () => {
  it('returns the authenticated wallet when request body omits walletAddress', () => {
    expect(
      getAuthorizedWalletAddress(
        '0x1111111111111111111111111111111111111111',
        undefined
      )
    ).toBe('0x1111111111111111111111111111111111111111')
  })

  it('allows a matching wallet address from the request body', () => {
    expect(
      getAuthorizedWalletAddress(
        '0x1111111111111111111111111111111111111111',
        '0x1111111111111111111111111111111111111111'
      )
    ).toBe('0x1111111111111111111111111111111111111111')
  })

  it('rejects mismatched wallet addresses', () => {
    expect(() =>
      getAuthorizedWalletAddress(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      )
    ).toThrow('Requested wallet does not match the authenticated wallet.')
  })

  it('recognizes authorization errors', () => {
    expect(isAuthorizationError(new Error('Requested wallet does not match the authenticated wallet.'))).toBe(true)
    expect(isAuthorizationError(new Error('Authenticated wallet address is missing from the session.'))).toBe(true)
    expect(isAuthorizationError(new Error('Something else'))).toBe(false)
  })

  it('falls back to a persisted wallet when the token claim is missing', () => {
    expect(
      resolveAuthorizedWalletAddress({
        authWalletAddress: undefined,
        persistedWalletAddress: '0x1111111111111111111111111111111111111111',
        requestedWalletAddress: '0x1111111111111111111111111111111111111111',
      })
    ).toBe('0x1111111111111111111111111111111111111111')
  })

  it('allows auth sync seeding from requested wallet when session wallet is absent', () => {
    expect(
      resolveAuthorizedWalletAddress({
        authWalletAddress: undefined,
        requestedWalletAddress: '0x1111111111111111111111111111111111111111',
        allowRequestedWithoutSessionWallet: true,
      })
    ).toBe('0x1111111111111111111111111111111111111111')
  })
})
