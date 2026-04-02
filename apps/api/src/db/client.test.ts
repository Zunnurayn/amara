import { beforeEach, describe, expect, it } from 'vitest'
import { getAgentSettings, resetInMemoryDb, updateAgentSettings, upsertUser } from './client'

describe('db client in-memory settings', () => {
  beforeEach(() => {
    resetInMemoryDb()
  })

  it('creates default settings for a synced user', async () => {
    const user = await upsertUser('privy_user_1', '0x1111111111111111111111111111111111111111')
    expect(user).not.toBeNull()

    const settings = await getAgentSettings(user!.id)
    expect(settings.auto_execute).toBe(true)
    expect(Number(settings.require_approval_above)).toBe(500)
    expect(settings.allow_swaps).toBe(true)
    expect(settings.allow_bridges).toBe(true)
    expect(settings.allow_sends).toBe(true)
  })

  it('persists updated guardrail settings in memory', async () => {
    const user = await upsertUser('privy_user_2', '0x2222222222222222222222222222222222222222')
    expect(user).not.toBeNull()

    const updated = await updateAgentSettings(user!.id, {
      auto_execute: false,
      require_approval_above: 125,
      allow_swaps: false,
      allow_bridges: true,
      allow_sends: false,
    })

    expect(updated.auto_execute).toBe(false)
    expect(Number(updated.require_approval_above)).toBe(125)
    expect(updated.allow_swaps).toBe(false)
    expect(updated.allow_bridges).toBe(true)
    expect(updated.allow_sends).toBe(false)

    const reloaded = await getAgentSettings(user!.id)
    expect(reloaded.auto_execute).toBe(false)
    expect(Number(reloaded.require_approval_above)).toBe(125)
    expect(reloaded.allow_swaps).toBe(false)
    expect(reloaded.allow_bridges).toBe(true)
    expect(reloaded.allow_sends).toBe(false)
  })
})
