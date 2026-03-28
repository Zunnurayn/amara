import type { Request, Response, NextFunction } from 'express'

export interface AuthenticatedRequest extends Request {
  userId?: string
  walletAddress?: string
}

function readBearerToken(req: Request) {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

function decodeClaims(token: string) {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const json = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(json) as { sub?: string; walletAddress?: string; address?: string }
  } catch {
    return null
  }
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = readBearerToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const claims = decodeClaims(token)
  if (!claims?.sub) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.userId = claims.sub
  req.walletAddress = claims.walletAddress ?? claims.address
  next()
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const token = readBearerToken(req)
  if (token) {
    const claims = decodeClaims(token)
    if (claims?.sub) {
      req.userId = claims.sub
      req.walletAddress = claims.walletAddress ?? claims.address
    }
  }
  next()
}
