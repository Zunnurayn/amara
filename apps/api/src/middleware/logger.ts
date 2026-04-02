import type { Request, Response, NextFunction } from 'express'

type LogLevel = 'info' | 'warn' | 'error'

type LogFields = Record<string, unknown>

// ── Request Logger ──────────────────────────────────────────────
export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now()
  _res.on('finish', () => {
    const ms     = Date.now() - start
    const status = _res.statusCode
    const color  = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
    console.log(`${color}${req.method}\x1b[0m ${req.path} ${status} — ${ms}ms`)
  })
  next()
}

export function logEvent(event: string, fields: LogFields = {}) {
  writeStructuredLog('info', event, fields)
}

export function logWarn(event: string, fields: LogFields = {}) {
  writeStructuredLog('warn', event, fields)
}

export function logErrorEvent(event: string, fields: LogFields = {}) {
  writeStructuredLog('error', event, fields)
}

// ── Global Error Handler ────────────────────────────────────────
export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode ?? 500
  const isDev      = process.env.NODE_ENV === 'development'

  console.error(`[Error] ${req.method} ${req.path}`, {
    message: err.message,
    code:    err.code,
    stack:   isDev ? err.stack : undefined,
  })

  res.status(statusCode).json({
    error:   statusCode >= 500 ? 'Internal server error' : err.message,
    code:    err.code,
    ...(isDev && { stack: err.stack }),
  })
}

// ── Not Found ───────────────────────────────────────────────────
export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  })
}

function writeStructuredLog(level: LogLevel, event: string, fields: LogFields) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  }

  if (level === 'error') {
    console.error(JSON.stringify(payload))
    return
  }
  if (level === 'warn') {
    console.warn(JSON.stringify(payload))
    return
  }
  console.log(JSON.stringify(payload))
}
