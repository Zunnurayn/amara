export type GuardrailSettings = {
  allow_swaps?: boolean
  allow_bridges?: boolean
  allow_sends?: boolean
  require_approval_above: number
}

export function evaluateGuardrails(
  actionType: string | undefined,
  estimatedUsd: number | undefined,
  settings: GuardrailSettings
) {
  const actionAllowed =
    actionType === 'swap' ? (settings.allow_swaps ?? true) :
    actionType === 'bridge' ? (settings.allow_bridges ?? true) :
    actionType === 'send' ? (settings.allow_sends ?? true) :
    true

  if (!actionAllowed && actionType) {
    return {
      allowed: false,
      warning: `This ${actionType} action is disabled in your guardrails.`,
    }
  }

  if (
    typeof estimatedUsd === 'number' &&
    estimatedUsd > Number(settings.require_approval_above)
  ) {
    return {
      allowed: false,
      warning: `This action exceeds your execution cap of ${formatUsd(settings.require_approval_above) ?? '$0.00'}. Raise the cap to continue.`,
    }
  }

  return { allowed: true, warning: null as string | null }
}

function formatUsd(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < 0.01) return '<$0.01'
  return `$${value.toFixed(2)}`
}
