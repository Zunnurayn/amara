import { describe, expect, it } from 'vitest'
import { evaluateGuardrails } from './guardrails'

describe('guardrail evaluation', () => {
  it('allows actions when toggles are enabled and cap is not exceeded', () => {
    expect(
      evaluateGuardrails('swap', 45, {
        allow_swaps: true,
        allow_bridges: true,
        allow_sends: true,
        require_approval_above: 50,
      })
    ).toEqual({
      allowed: true,
      warning: null,
    })
  })

  it('blocks disabled swap actions', () => {
    expect(
      evaluateGuardrails('swap', 10, {
        allow_swaps: false,
        allow_bridges: true,
        allow_sends: true,
        require_approval_above: 500,
      })
    ).toEqual({
      allowed: false,
      warning: 'This swap action is disabled in your guardrails.',
    })
  })

  it('blocks disabled bridge actions', () => {
    expect(
      evaluateGuardrails('bridge', 10, {
        allow_swaps: true,
        allow_bridges: false,
        allow_sends: true,
        require_approval_above: 500,
      })
    ).toEqual({
      allowed: false,
      warning: 'This bridge action is disabled in your guardrails.',
    })
  })

  it('blocks actions above the execution cap', () => {
    expect(
      evaluateGuardrails('send', 125, {
        allow_swaps: true,
        allow_bridges: true,
        allow_sends: true,
        require_approval_above: 50,
      })
    ).toEqual({
      allowed: false,
      warning: 'This action exceeds your execution cap of $50.00. Raise the cap to continue.',
    })
  })
})
