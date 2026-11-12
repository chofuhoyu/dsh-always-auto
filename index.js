/**
 * dsh-always-auto host half.
 *
 * The shipped permission service deliberately keeps `auto` out of new-session
 * defaults and validates a configured default preset by name. This plugin keeps
 * the Auto choice in its own live config field and pins Auto at the exact point
 * where the permission service fills a genuinely fresh session, before its own
 * configured default is written.
 */
import z from '@deepseek-ai/schemastery'

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'dsh-always-auto'

/** The permission service this plugin extends. */
export const inject = ['permissionPresets']

/** Live user preference: `auto` selects Auto review for new sessions; empty defers to the permission default. */
export const Config = z.object({
  defaultPreset: z.string().default('').volatile(),
})

const AUTO = 'auto'

/**
 * Install the fresh-session Auto pin and hide this plugin's own raw config from
 * the generated settings page (the Permissions row owns the choice).
 * @param ctx - Host plugin context.
 * @param config - live plugin config (volatile fields are references).
 */
export function apply(ctx, config) {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })

  const wantsAuto = () => {
    const field = config?.defaultPreset
    const value = field !== null && typeof field === 'object' && typeof field.get === 'function' ? field.get() : field
    return value === AUTO
  }

  const service = ctx.get('permissionPresets')
  const proto = service === undefined ? undefined : Object.getPrototypeOf(service)
  const originalPin = proto?.pinInitialPermission
  if (typeof originalPin !== 'function') {
    ctx.logger.warn('always-auto: permissionPresets does not expose pinInitialPermission; the new-session Auto default is unavailable on this Harness version')
    return
  }

  /**
   * Mirror the service's own fresh-session test, then switch that session to
   * Auto instead of writing the configured default preset.
   * @param session - the session whose missing permission facts are being filled.
   */
  const pinInitialPermission = function (session) {
    if (wantsAuto() && this.autoAdmit !== undefined) {
      let fresh = false
      try {
        const state = typeof this.permissionState === 'function' ? this.permissionState(session) : undefined
        fresh = state !== undefined
          && state.preset === null
          && state.sandbox === null
          && state.approval === null
          && state.seeded === false
      } catch (error) {
        ctx.logger.debug(`always-auto: could not inspect the initial permission state: ${error instanceof Error ? error.message : String(error)}`)
      }
      if (fresh) {
        this.set(session, AUTO)
        return
      }
    }
    return originalPin.call(this, session)
  }

  proto.pinInitialPermission = pinInitialPermission
  ctx.effect(() => () => {
    if (proto.pinInitialPermission === pinInitialPermission) proto.pinInitialPermission = originalPin
  }, 'always-auto: restore permission pinning')
}
