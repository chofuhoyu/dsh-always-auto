/**
 * Offline verification for the bunded host and client halves.
 *
 * The browser half is evaluated exactly like the DSH module loader does, then
 * `apply` runs against a minimal fake Client context. The Host half runs
 * against a fake permission service. Neither check replaces installing the
 * bundle in a live profile.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

// ---------------------------------------------------------------- client half

const clientSource = await readFile(new URL('../client.js', import.meta.url), 'utf8')
let row
const sandbox = {
  window: {
    __ModuleLoader__: {
      load(value) {
        row = value
      },
    },
  },
  console,
  document: {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, remove() {} }),
    head: { appendChild() {} },
  },
  setTimeout,
  clearTimeout,
}
vm.runInNewContext(clientSource, sandbox, { filename: 'client.js' })

assert.equal(row?.id, 'dsh-always-auto', 'client bundle id')
assert.equal(typeof row.factory, 'function', 'client factory')

const React = {
  createElement: () => null,
  Fragment: Symbol('Fragment'),
  useState: () => [undefined, () => {}],
  useCallback: (fn) => fn,
  useEffect: () => {},
  useRef: () => ({ current: null }),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
}
const requireStub = (id) => {
  if (id === 'react') return React
  if (id === 'react-dom') return { createPortal: () => null }
  throw new Error(`unexpected client require: ${id}`)
}
const plugin = row.factory(requireStub)
assert.equal(typeof plugin.apply, 'function', 'client apply')
assert.deepEqual(Array.from(plugin.inject), [
  'commandUi',
  'connection',
  'sessions',
  'slots',
  'locale',
  'remote',
  'remote.permissionPresets',
  'configForms',
])

const registrations = []
const disposers = []
let decoration
let catalogReads = 0
const changes = []
const catalog = {
  options: [
    { value: 'read-only', name: 'read-only' },
    { value: 'workspace-write', name: 'workspace-write' },
    { value: 'danger-full-access', name: 'danger-full-access' },
    { value: 'auto', name: 'auto' },
  ],
  defaultOptions: [
    { value: 'read-only', name: 'read-only' },
    { value: 'workspace-write', name: 'workspace-write' },
    { value: 'danger-full-access', name: 'danger-full-access' },
  ],
  defaultPreset: 'workspace-write',
}
const forms = new Map([
  ['permission', makeForm({ defaultPreset: 'workspace-write' })],
  ['always-auto', makeForm({ defaultPreset: '' })],
])
function makeForm(value) {
  const snapshot = { status: 'ready', value, base: undefined, user: undefined, revision: 1, writable: true }
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    set: async (field, next) => {
      changes.push([field, next])
      snapshot.value = { ...snapshot.value, [field]: next }
      return true
    },
  }
}
const ctx = {
  effect(callback, label) {
    const dispose = callback()
    disposers.push({ label, dispose })
    return () => {}
  },
  locale: {
    register() {
      return () => {}
    },
    bind: () => (key, params) => (params?.name !== undefined ? `${key}:${params.name}` : key),
  },
  remote: {
    permissionPresets: {
      async catalog() {
        catalogReads += 1
        return { ok: true, value: catalog }
      },
    },
    $on: () => () => {},
  },
  sessions: {
    binding: () => ({
      session: {
        projections: {
          faceOf: () => ({ getSnapshot: () => ({ currentValue: 'workspace-write' }) }),
        },
      },
    }),
  },
  configForms: {
    get: (id) => forms.get(id),
  },
  slots: {
    inject(_key, callback) {
      callback()
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
  connection: { generation: { subscribe: () => () => {} } },
  commandUi: {
    decorate(value) {
      decoration = value
      return () => {}
    },
  },
}
plugin.apply(ctx)
await Promise.resolve()
await Promise.resolve()

assert.ok(catalogReads >= 1, 'client reads the permission catalog')
assert.equal(registrations.length, 2, 'registers exactly two slot occupants')
const settings = registrations.find((entry) => entry.options.name === 'settings.general.item')
assert.ok(settings, 'settings row registered')
assert.equal(settings.options.id, 'permission')
assert.equal(settings.options.priority, -1, 'settings row shadows the shipped cell')
assert.equal(settings.options.locale, 'always-auto')
assert.equal(typeof settings.component, 'function')
const picker = registrations.find((entry) => entry.options.name === 'conversation.input.permission')
assert.ok(picker, 'composer control registered')
assert.equal(picker.options.priority, -1, 'composer control shadows the shipped single slot')
assert.equal(typeof picker.component, 'function')

assert.ok(decoration, '/permission decoration registered')
assert.equal(decoration.name, 'permission')
const session = { sessionId: 's1' }
const options = await decoration.ui.options(session, new AbortController().signal)
const autoOption = options.find((option) => option.id === 'auto')
const fullAccess = options.find((option) => option.id === 'danger-full-access')
assert.ok(autoOption, 'Auto is offered by the popup')
assert.equal(autoOption.confirmation, undefined, 'Auto has no confirmation gate')
assert.ok(fullAccess.confirmation, 'Full access keeps its confirmation gate')

const t = (key, params) => (params?.name !== undefined ? `${key}:${params.name}` : key)
assert.doesNotThrow(() => settings.component({
  t,
  catalogStore: { get: () => ({ value: catalog, error: null, loading: false }), subscribe: () => () => {} },
  permissionForm: forms.get('permission'),
  autoForm: forms.get('always-auto'),
}), 'settings row renders')
assert.doesNotThrow(() => picker.component({
  t,
  locked: false,
  select: async () => {},
  catalogStore: { get: () => ({ value: catalog, error: null, loading: false }), subscribe: () => () => {} },
  useProjection: () => ({ currentValue: 'workspace-write' }),
}), 'composer control renders')

console.log('client half: ok')

// ------------------------------------------------------------------ host half

const host = await import('../index.js')
assert.equal(host.name, 'dsh-always-auto')
assert.deepEqual(host.inject, ['permissionPresets'])

const pinned = []
const restored = []
let configureCalls = 0
const fakeCtx = {
  logger: { warn() {}, debug() {}, info() {} },
  fiber: {},
  get: (name) => (name === 'permissionPresets' ? fakeService : undefined),
  inject: (names, callback) => {
    if (names.includes('settings')) {
      callback({
        effect: (fn) => fn(),
        settings: {
          configure() {
            configureCalls += 1
            return () => {}
          },
        },
      })
    }
  },
  effect: (callback, label) => {
    const dispose = callback()
    restored.push({ label, dispose })
    return () => {}
  },
}
const proto = {
  pinInitialPermission() {
    pinned.push('original')
  },
}
const fakeService = Object.create(proto)
fakeService.autoAdmit = () => {}
fakeService.permissionState = () => ({ preset: null, sandbox: null, approval: null, seeded: false })
fakeService.set = (session, name) => {
  pinned.push(`${session.id}:${name}`)
}

host.apply(fakeCtx, { defaultPreset: { get: () => 'auto' } })
assert.ok(configureCalls >= 1, 'host hides its raw config from the generic page')
assert.notEqual(proto.pinInitialPermission, undefined)
proto.pinInitialPermission.call(fakeService, { id: 'fresh' })
assert.deepEqual(pinned, ['fresh:auto'], 'fresh session pins Auto')

pinned.length = 0
fakeService.permissionState = () => ({ preset: 'workspace-write', sandbox: 'workspace-write', approval: 'ask', seeded: true })
proto.pinInitialPermission.call(fakeService, { id: 'restored' })
assert.deepEqual(pinned, ['original'], 'restored session keeps its own permission')

pinned.length = 0
fakeService.autoAdmit = undefined
proto.pinInitialPermission.call(fakeService, { id: 'no-auto' })
assert.deepEqual(pinned, ['original'], 'missing Auto integration falls back to the configured default')

for (const entry of restored) {
  if (entry.dispose) entry.dispose()
}
console.log('host half: ok')
