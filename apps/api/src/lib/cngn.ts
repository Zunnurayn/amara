import crypto from 'crypto'
import { Buffer } from 'buffer'
import { readFileSync } from 'fs'
import sodium from 'libsodium-wrappers'

export interface CngnVirtualAccount {
  accountReference: string
  accountNumber: string
  bankName?: string | null
  accountName?: string | null
}

export interface CngnTransaction {
  id: string
  amount: string
  description?: string | null
  createdAt: string
  trx_ref?: string | null
  trx_type?: string | null
  network?: string | null
  asset_symbol?: string | null
  base_trx_hash?: string | null
  extl_trx_hash?: string | null
  explorer_link?: string | null
  status?: string | null
  receiver?: {
    address?: string | null
    accountNumber?: string | null
    bank?: {
      name?: string | null
    } | null
  } | null
}

type CngnEnvelope = {
  status: number
  message: string
  data: string
}

type AesCipherPayload = {
  content: string
  iv: string
}

const CNGN_API_BASE_URL = process.env.CNGN_API_BASE_URL?.trim() || 'https://api.cngn.co'

export async function createCngnVirtualAccount() {
  const response = await cngnRequest<CngnVirtualAccount>('/v1/api/createVirtualAccount', {
    method: 'POST',
    body: {
      provider: 'korapay',
    },
  })

  return response.data
}

export async function getCngnTransactions(page = 1, limit = 20) {
  const response = await cngnRequest<{
    data: CngnTransaction[]
    pagination?: {
      count?: number
      pages?: number
      isLastPage?: boolean
      nextPage?: number | null
      previousPage?: number | null
    }
  }>(`/v1/api/transactions?page=${page}&limit=${limit}`, {
    method: 'GET',
  })

  return response.data
}

async function cngnRequest<T>(path: string, options: {
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
}) {
  const apiKey = readRequiredEnv('CNGN_API_KEY')
  const encryptionKey = readRequiredEnv('CNGN_ENCRYPTION_KEY')
  const privateKey = readCngnPrivateKey()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const response = await fetch(`${CNGN_API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(encryptPayload(JSON.stringify(options.body), encryptionKey)) : undefined,
  })

  if (!response.ok) {
    throw new Error(`cNGN request failed with status ${response.status}`)
  }

  const payload = await response.json() as Partial<CngnEnvelope>
  if (typeof payload.data !== 'string') {
    throw new Error(payload.message ?? 'cNGN response payload was invalid.')
  }

  const decrypted = await decryptPayload(privateKey, payload.data)
  const parsed = JSON.parse(decrypted) as {
    status?: number
    message?: string
    data?: T
  }

  if (parsed.status && parsed.status >= 400) {
    throw new Error(parsed.message ?? 'cNGN request failed.')
  }

  if (parsed.data === undefined) {
    throw new Error(parsed.message ?? 'cNGN response did not include data.')
  }

  return {
    status: parsed.status ?? payload.status ?? 200,
    message: parsed.message ?? payload.message ?? 'OK',
    data: parsed.data,
  }
}

function encryptPayload(data: string, key: string): AesCipherPayload {
  const iv = crypto.randomBytes(16)
  const hashedKey = crypto.createHash('sha256').update(key).digest()
  const cipher = crypto.createCipheriv('aes-256-cbc', hashedKey, iv)

  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return {
    content: encrypted,
    iv: iv.toString('base64'),
  }
}

async function decryptPayload(privateKey: string, encryptedData: string) {
  await sodium.ready

  const fullPrivateKey = parseOpenSshPrivateKey(privateKey)
  const curve25519PrivateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(fullPrivateKey)
  const encryptedBuffer = Buffer.from(encryptedData, 'base64')
  const nonce = encryptedBuffer.subarray(0, sodium.crypto_box_NONCEBYTES)
  const ephemeralPublicKey = encryptedBuffer.subarray(-sodium.crypto_box_PUBLICKEYBYTES)
  const ciphertext = encryptedBuffer.subarray(sodium.crypto_box_NONCEBYTES, -sodium.crypto_box_PUBLICKEYBYTES)
  const decrypted = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    ephemeralPublicKey,
    curve25519PrivateKey
  )

  return sodium.to_string(decrypted)
}

function parseOpenSshPrivateKey(privateKey: string) {
  const lines = privateKey.trim().split('\n')
  const base64PrivateKey = lines.slice(1, -1).join('')
  const privateKeyBuffer = Buffer.from(base64PrivateKey, 'base64')
  const keyDataStart = privateKeyBuffer.indexOf(Buffer.from([0x00, 0x00, 0x00, 0x40]))

  if (keyDataStart === -1) {
    throw new Error('Unable to find Ed25519 key data in CNGN private key.')
  }

  return new Uint8Array(privateKeyBuffer.subarray(keyDataStart + 4, keyDataStart + 68))
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }
  return value
}

function readCngnPrivateKey() {
  const inline = process.env.CNGN_PRIVATE_KEY
  if (inline?.trim()) return inline

  const path = process.env.CNGN_PRIVATE_KEY_PATH?.trim()
  if (!path) {
    throw new Error('CNGN_PRIVATE_KEY or CNGN_PRIVATE_KEY_PATH must be configured.')
  }

  return readFileSync(path, 'utf8')
}
