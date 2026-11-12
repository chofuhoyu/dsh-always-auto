/**
 * dsh-always-auto client half.
 *
 * Replaces the shipped permission surfaces (the General-settings row, the
 * composer picker, and the /permission popup) so that:
 *   - Auto review is offered as the new-session default in Settings > General.
 *   - Selecting Auto never opens the experimental-enable risk confirmation.
 *   - Full access keeps its risk confirmation.
 */
window.__ModuleLoader__.load({
  id: 'dsh-always-auto',
  factory(require) {
    const React = require('react')
    let createPortal = null
    try {
      const ReactDOM = require('react-dom')
      if (ReactDOM !== null && typeof ReactDOM.createPortal === 'function') createPortal = ReactDOM.createPortal
    } catch (error) {
      console.warn('always-auto: react-dom is unavailable; overlays render inline', error)
    }
    const h = React.createElement

    const NS = 'always-auto'
    const AUTO = 'auto'
    const FULL_ACCESS = 'danger-full-access'

    const PRESET_LABEL_KEYS = {
      'read-only': 'presetReadOnly',
      'workspace-write': 'presetWorkspaceWrite',
      'danger-full-access': 'presetFullAccess',
    }

    /** Simplified Chinese dictionary: the key-set source of truth. */
    const zh = {
      title: '权限',
      description: '选择新会话的默认权限模式',
      loading: '加载中',
      unavailable: '不可用',
      saveFailed: '保存失败，请重试',
      presetReadOnly: '仅可查看',
      presetWorkspaceWrite: '工作区内修改',
      presetFullAccess: '完全权限',
      autoLabel: '自动审查',
      autoBadge: 'EXP',
      autoDescription: '无沙箱运行；每次原生工具调用和 PTC 内层调用前由同一模型进行实验性审查。',
      autoUnavailable: '自动审查当前不可用',
      confirmTitle: '确认启用完全权限？',
      confirmDescription: '启用完全权限后，智能体将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。',
      confirmAcknowledge: '我已了解风险，并愿意继续',
      confirmCancel: '取消',
      confirmEnable: '启用完全权限',
      mode: '权限模式，当前：{name}',
      close: '关闭',
    }
    // Keep every dictionary on the same key set; untranslated locales fall back to English.
    const en = {
      title: 'Permission',
      description: 'Choose the default permission mode for new sessions',
      loading: 'Loading',
      unavailable: 'Unavailable',
      saveFailed: 'Could not save. Try again.',
      presetReadOnly: 'Read Only',
      presetWorkspaceWrite: 'Workspace Write',
      presetFullAccess: 'Full access',
      autoLabel: 'Auto review',
      autoBadge: 'EXP',
      autoDescription: 'Run without a sandbox after an experimental same-model review of every native tool call and PTC inner call.',
      autoUnavailable: 'Auto review is unavailable right now',
      confirmTitle: 'Enable Full access?',
      confirmDescription: 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.',
      confirmAcknowledge: 'I understand the risks and want to continue',
      confirmCancel: 'Cancel',
      confirmEnable: 'Enable Full access',
      mode: 'Permission mode, current: {name}',
      close: 'Close',
    }

    const CSS = `
.dsh-aa-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.dsh-aa-rowText{display:flex;flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px}
.dsh-aa-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}
.dsh-aa-desc{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:400;line-height:18px}
.dsh-aa-selector{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border:none;border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;cursor:pointer;max-width:260px}
.dsh-aa-selector:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.dsh-aa-selector:disabled{color:var(--dsw-alias-label-secondary);cursor:default}
.dsh-aa-trigger{display:inline-flex;align-items:center;gap:4px;height:28px;max-width:220px;padding:0 4px 0 8px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;font-weight:500;line-height:20px;cursor:pointer}
.dsh-aa-trigger:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.dsh-aa-trigger:disabled{opacity:.6;cursor:default}
.dsh-aa-triggerLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-aa-chevron{flex:none;width:12px;height:12px;color:var(--dsw-alias-label-secondary)}
.dsh-aa-menu{position:fixed;z-index:1200;min-width:232px;max-width:320px;padding:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);display:flex;flex-direction:column;gap:2px}
.dsh-aa-item{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;font:inherit;cursor:pointer}
.dsh-aa-item:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-aa-itemMain{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.dsh-aa-itemLabel{display:flex;align-items:center;gap:4px;min-width:0}
.dsh-aa-itemText{font-size:13px;line-height:20px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-aa-itemDetail{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsh-aa-badge{flex:none;font-size:8px;font-weight:600;letter-spacing:.2px;line-height:10px;color:var(--dsw-alias-label-secondary)}
.dsh-aa-check{flex:none;color:var(--dsw-alias-brand-primary);font-size:12px;line-height:16px}
.dsh-aa-backdrop{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent)}
.dsh-aa-dialog{width:min(440px,100%);outline:none;display:flex;flex-direction:column;gap:12px;padding:20px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}
.dsh-aa-dialogTitle{font-size:16px;font-weight:600;line-height:24px}
.dsh-aa-dialogDesc{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.dsh-aa-ack{display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);cursor:pointer}
.dsh-aa-ack input{margin-top:3px;accent-color:var(--dsw-alias-brand-primary)}
.dsh-aa-actions{display:flex;justify-content:flex-end;gap:8px}
.dsh-aa-btn{height:32px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer}
.dsh-aa-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.dsh-aa-btn:disabled{opacity:.5;cursor:default}
.dsh-aa-btnPrimary{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
`

    /** Install the plugin stylesheet once; the returned disposer removes it. */
    function installStyles() {
      if (typeof document === 'undefined') return () => {}
      if (document.querySelector('style[data-plugin="dsh-always-auto"]') !== null) return () => {}
      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-always-auto'
      style.textContent = CSS
      document.head.appendChild(style)
      return () => {
        style.remove()
      }
    }

    /** One tiny external store shared by React components and imperative reads. */
    function createStore(initial) {
      let value = initial
      const listeners = new Set()
      return {
        get() {
          return value
        },
        set(next) {
          if (Object.is(next, value)) return
          value = next
          for (const listener of [...listeners]) listener()
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }
    }

    /** Subscribe a component to a store with React 18's external-store hook. */
    function useStore(store) {
      return React.useSyncExternalStore(store.subscribe, store.get, store.get)
    }

    /** Subscribe a component to a settings ConfigForm snapshot. */
    function useForm(form) {
      const subscribe = React.useCallback((listener) => form.subscribe(listener), [form])
      const read = React.useCallback(() => form.getSnapshot(), [form])
      return React.useSyncExternalStore(subscribe, read, read)
    }

    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    /** Portal when react-dom is present; otherwise render in place. */
    function portal(node) {
      if (createPortal === null || typeof document === 'undefined') return node
      return createPortal(node, document.body)
    }

    function displayName(value) {
      if (value === undefined || value === null || value === '') return ''
      return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
        ? value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        : value
    }

    /** Product label for one preset value, localized where the product owns the name. */
    function presetLabel(value, name, t) {
      if (value === AUTO) return t('autoLabel')
      const key = PRESET_LABEL_KEYS[value]
      if (key !== undefined) return t(key)
      return displayName(name ?? value)
    }

    /** Read the process-level permission catalog into a shared store. */
    function createCatalog(ctx) {
      const store = createStore({ value: null, error: null, loading: true })
      let disposed = false
      let inflight = null
      const refresh = () => {
        if (disposed) return Promise.resolve()
        if (inflight !== null) return inflight
        store.set({ value: store.get().value, error: null, loading: true })
        inflight = Promise.resolve()
          .then(() => ctx.remote.permissionPresets.catalog())
          .then((result) => {
            if (disposed) return
            if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
            store.set({ value: result.value, error: null, loading: false })
          })
          .catch((error) => {
            if (disposed) return
            store.set({ value: null, error: messageOf(error), loading: false })
          })
          .finally(() => {
            inflight = null
          })
        return inflight
      }
      const stop = ctx.remote.$on('permission-presets/catalog-changed', () => {
        void refresh()
      })
      const generation = ctx.connection?.generation
      const stopGeneration = typeof generation?.subscribe === 'function'
        ? generation.subscribe(() => {
          void refresh()
        })
        : undefined
      void refresh()
      return {
        store,
        refresh,
        load: async () => {
          await refresh()
          return store.get().value
        },
        dispose() {
          disposed = true
          if (typeof stop === 'function') stop()
          if (typeof stopGeneration === 'function') stopGeneration()
        },
      }
    }

    /** Submit a current-session permission switch through the host command. */
    function createSubmit(ctx) {
      return async (sessionId, preset) => {
        const live = ctx.sessions.binding(sessionId)?.session
        if (live === undefined) throw new Error('this session is not materialized yet')
        const result = await live.command(`/permission ${preset}`)
        if (!result.ok) throw new Error(`permission switch failed: ${result.error.code}: ${result.error.message}`)
        if (!result.value.matched) throw new Error('the host offers no /permission command')
        return true
      }
    }

    function selectionOf(live) {
      try {
        return live?.projections.faceOf('permissions').getSnapshot()
      } catch {
        return undefined
      }
    }

    /** Position a body-portal menu relative to its trigger. */
    function usePopoverPosition(open, anchorRef) {
      const [position, setPosition] = React.useState(null)
      React.useEffect(() => {
        if (!open) {
          setPosition(null)
          return undefined
        }
        const update = () => {
          const node = anchorRef.current
          if (node === null) return
          const rect = node.getBoundingClientRect()
          const margin = 8
          const left = Math.max(margin, Math.min(rect.left, window.innerWidth - 328))
          const below = window.innerHeight - rect.bottom
          const openUp = below < 300 && rect.top > below
          setPosition(openUp
            ? { left, bottom: window.innerHeight - rect.top + 6 }
            : { left, top: rect.bottom + 6 })
        }
        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        return () => {
          window.removeEventListener('resize', update)
          window.removeEventListener('scroll', update, true)
        }
      }, [open, anchorRef])
      return position
    }

    /** Close a popover on outside mousedown or Escape. */
    function useDismiss(open, menuRef, anchorRef, onClose) {
      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          if (menuRef.current?.contains(event.target) === true) return
          if (anchorRef.current?.contains(event.target) === true) return
          onClose()
        }
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          onClose()
        }
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown, true)
        }
      }, [open, menuRef, anchorRef, onClose])
    }

    /** Body-portal dropdown anchored to one trigger. */
    function Dropdown({ open, anchorRef, items, onSelect, onClose }) {
      const menuRef = React.useRef(null)
      const position = usePopoverPosition(open, anchorRef)
      useDismiss(open, menuRef, anchorRef, onClose)
      if (!open || position === null || typeof document === 'undefined') return null
      return portal(h('div', {
        ref: menuRef,
        className: 'dsh-aa-menu',
        role: 'menu',
        style: { left: position.left, ...(position.top !== undefined ? { top: position.top } : { bottom: position.bottom }), maxWidth: 320 },
      }, items.map((item) => h('button', {
        key: item.id,
        type: 'button',
        role: 'menuitemradio',
        'aria-checked': item.active ? 'true' : 'false',
        className: 'dsh-aa-item',
        onClick: () => {
          onSelect(item.id)
        },
      },
      h('span', { className: 'dsh-aa-itemMain' },
        h('span', { className: 'dsh-aa-itemLabel' },
          h('span', { className: 'dsh-aa-itemText' }, item.label),
          item.badge !== undefined ? h('span', { className: 'dsh-aa-badge' }, item.badge) : null),
        item.detail !== undefined ? h('span', { className: 'dsh-aa-itemDetail' }, item.detail) : null),
      item.active ? h('span', { className: 'dsh-aa-check', 'aria-hidden': 'true' }, '✓') : null))))
    }

    function Chevron() {
      return h('svg', {
        className: 'dsh-aa-chevron',
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': 'true',
      }, h('path', {
        d: 'M4 6l4 4 4-4',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }))
    }

    /** Copy of the host risk gate used only for Full access. */
    function RiskDialog({ open, title, description, acknowledge, cancel, confirm, onCancel, onConfirm }) {
      const [acknowledged, setAcknowledged] = React.useState(false)
      const dialogRef = React.useRef(null)
      React.useEffect(() => {
        if (!open) setAcknowledged(false)
      }, [open])
      React.useEffect(() => {
        if (open) dialogRef.current?.focus()
      }, [open])
      React.useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape') onCancel()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
          window.removeEventListener('keydown', onKeyDown)
        }
      }, [open, onCancel])
      if (!open || typeof document === 'undefined') return null

      const acknowledgeRow = h('label', { className: 'dsh-aa-ack' },
        h('input', {
          type: 'checkbox',
          checked: acknowledged,
          onChange: (event) => {
            setAcknowledged(event.target.checked)
          },
        }),
        h('span', null, acknowledge))
      const actions = h('div', { className: 'dsh-aa-actions' },
        h('button', { type: 'button', className: 'dsh-aa-btn', onClick: onCancel }, cancel),
        h('button', {
          type: 'button',
          className: 'dsh-aa-btn dsh-aa-btnPrimary',
          disabled: !acknowledged,
          onClick: onConfirm,
        }, confirm))
      const dialog = h('div', {
        ref: dialogRef,
        tabIndex: -1,
        className: 'dsh-aa-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': title,
      },
      h('div', { className: 'dsh-aa-dialogTitle' }, title),
      h('div', { className: 'dsh-aa-dialogDesc' }, description),
      acknowledgeRow,
      actions)
      return portal(h('div', {
        className: 'dsh-aa-backdrop',
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) onCancel()
        },
      }, dialog))
    }

    function rowItems(options, currentValue, t, withDetail) {
      return options.map((option) => {
        const isAuto = option.value === AUTO
        const item = {
          id: option.value,
          label: presetLabel(option.value, option.name, t),
          active: option.value === currentValue,
        }
        if (isAuto) {
          item.badge = t('autoBadge')
          item.detail = withDetail ? t('autoDescription') : undefined
        } else if (withDetail && option.description !== undefined) {
          item.detail = option.description
        }
        return item
      })
    }

    /** General-settings row: the default permission for new sessions. */
    function SettingsRow({ t, catalogStore, permissionForm, autoForm }) {
      const catalogState = useStore(catalogStore)
      const permission = useForm(permissionForm)
      const auto = useForm(autoForm)
      const [open, setOpen] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [confirming, setConfirming] = React.useState(false)
      const triggerRef = React.useRef(null)

      if (permission.status === 'unavailable') return null

      const catalog = catalogState.value
      const options = catalog === null ? [] : catalog.options
      const autoStored = auto.status === 'ready' && auto.value !== undefined ? auto.value.defaultPreset : undefined
      const fallback = permission.value?.defaultPreset ?? catalog?.defaultPreset ?? ''
      const autoOffered = options.some((option) => option.value === AUTO)
      const currentValue = autoStored === AUTO && autoOffered ? AUTO : fallback
      const current = options.find((option) => option.value === currentValue)
      const loading = permission.status === 'loading' || (catalogState.loading && catalog === null)
      const label = current !== undefined
        ? presetLabel(current.value, current.name, t)
        : loading
          ? t('loading')
          : displayName(currentValue)
      const disabled = busy || loading || !permission.writable || options.length === 0
      const description = error ?? (catalogState.error !== null ? t('unavailable') : t('description'))

      const submitDefault = async (value) => {
        setBusy(true)
        setError(null)
        try {
          if (value === AUTO) {
            const saved = await autoForm.set('defaultPreset', AUTO)
            if (!saved) throw new Error(t('saveFailed'))
            return
          }
          const cleared = await autoForm.set('defaultPreset', '')
          if (!cleared) throw new Error(t('saveFailed'))
          const saved = await permissionForm.set('defaultPreset', value)
          if (!saved) throw new Error(t('saveFailed'))
        } catch (cause) {
          setError(messageOf(cause))
        } finally {
          setBusy(false)
        }
      }

      const choose = (value) => {
        setOpen(false)
        if (value === currentValue) return
        if (value === FULL_ACCESS) {
          setConfirming(true)
          return
        }
        void submitDefault(value)
      }

      const items = rowItems(options, currentValue, t, false)
      return h(React.Fragment, null,
        h('div', { className: 'dsh-aa-row' },
          h('div', { className: 'dsh-aa-rowText' },
            h('div', { className: 'dsh-aa-title' }, t('title')),
            h('div', {
              className: 'dsh-aa-desc',
              role: error !== null ? 'alert' : undefined,
            }, description)),
          h('button', {
            ref: triggerRef,
            type: 'button',
            className: 'dsh-aa-selector',
            'aria-haspopup': 'menu',
            'aria-expanded': open ? 'true' : 'false',
            disabled,
            onClick: () => {
              setOpen((value) => !value)
            },
          }, label, h(Chevron))),
        h(Dropdown, {
          open,
          anchorRef: triggerRef,
          items,
          onSelect: choose,
          onClose: () => {
            setOpen(false)
          },
        }),
        h(RiskDialog, {
          open: confirming,
          title: t('confirmTitle'),
          description: t('confirmDescription'),
          acknowledge: t('confirmAcknowledge'),
          cancel: t('confirmCancel'),
          confirm: t('confirmEnable'),
          onCancel: () => {
            setConfirming(false)
          },
          onConfirm: () => {
            setConfirming(false)
            void submitDefault(FULL_ACCESS)
          },
        }))
    }

    /** Composer control: the current session's permission. */
    function PermissionPicker({ t, locked, select, catalogStore, useProjection }) {
      const selection = useProjection('permissions')
      const catalogState = useStore(catalogStore)
      const [open, setOpen] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [confirming, setConfirming] = React.useState(false)
      const triggerRef = React.useRef(null)

      React.useEffect(() => {
        if (!locked) return
        setOpen(false)
        setConfirming(false)
      }, [locked])

      if (selection === undefined || catalogState.value === null) return null

      const catalog = catalogState.value
      const currentValue = selection.currentValue
      const current = catalog.options.find((option) => option.value === currentValue)
      const label = current !== undefined ? presetLabel(current.value, current.name, t) : displayName(currentValue)
      const busyNow = busy || confirming

      const runSelect = async (value) => {
        setBusy(true)
        try {
          await select(value)
        } catch (error) {
          console.warn('always-auto: permission switch failed', error)
        } finally {
          setBusy(false)
        }
      }

      const choose = (value) => {
        setOpen(false)
        if (value === currentValue) return
        if (value === FULL_ACCESS) {
          setConfirming(true)
          return
        }
        void runSelect(value)
      }

      const items = rowItems(catalog.options, currentValue, t, true)
      return h(React.Fragment, null,
        h('button', {
          ref: triggerRef,
          type: 'button',
          className: 'dsh-aa-trigger',
          'aria-label': t('mode', { name: label }),
          disabled: locked || busyNow,
          onClick: () => {
            setOpen((value) => !value)
          },
        }, h('span', { className: 'dsh-aa-triggerLabel' }, label), h(Chevron)),
        h(Dropdown, {
          open,
          anchorRef: triggerRef,
          items,
          onSelect: choose,
          onClose: () => {
            setOpen(false)
          },
        }),
        h(RiskDialog, {
          open: confirming,
          title: t('confirmTitle'),
          description: t('confirmDescription'),
          acknowledge: t('confirmAcknowledge'),
          cancel: t('confirmCancel'),
          confirm: t('confirmEnable'),
          onCancel: () => {
            setConfirming(false)
          },
          onConfirm: () => {
            setConfirming(false)
            void runSelect(FULL_ACCESS)
          },
        }))
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, {
        zh,
        en,
        ja: en,
        es: en,
        fr: en,
        de: en,
        ru: en,
        pt: en,
      }), 'always-auto: locale dictionaries')
      ctx.effect(() => installStyles(), 'always-auto: styles')

      const t = ctx.locale.bind(NS)
      const catalogs = createCatalog(ctx)
      ctx.effect(() => () => catalogs.dispose(), 'always-auto: catalog subscription')
      const submit = createSubmit(ctx)
      const sessionFor = (session) => ctx.sessions.binding(session.sessionId)?.session

      const permissionForm = ctx.configForms.get('permission')
      const autoForm = ctx.configForms.get('always-auto')

      ctx.slots.inject('settings.general.item', () => {
        try {
          return ctx.slots.register({
            name: 'settings.general.item',
            id: 'permission',
            order: -20,
            priority: -1,
            locale: NS,
            inject: () => ({ catalogStore: catalogs.store, permissionForm, autoForm }),
          }, SettingsRow)
        } catch (error) {
          console.warn('always-auto: could not register the Permissions settings row', error)
          return () => {}
        }
      })

      ctx.slots.inject('conversation.input.permission', () => {
        try {
          return ctx.slots.register({
            name: 'conversation.input.permission',
            priority: -1,
            locale: NS,
            inject: (sessionId) => ({ catalogStore: catalogs.store, select: (preset) => submit(sessionId, preset) }),
          }, PermissionPicker)
        } catch (error) {
          console.warn('always-auto: could not register the composer permission control', error)
          return () => {}
        }
      })

      try {
        ctx.effect(() => ctx.commandUi.decorate({
          name: 'permission',
          available: (session) => selectionOf(sessionFor(session)) !== undefined,
          ui: {
            kind: 'popupSelect',
            options: async (session) => {
              const selection = selectionOf(sessionFor(session))
              if (selection === undefined) throw new Error('permission presets are not available on this host')
              const catalog = await catalogs.load()
              if (catalog === null) throw new Error(catalogs.store.get().error ?? 'permission catalog is unavailable')
              return catalog.options.map((option) => {
                const isAuto = option.value === AUTO
                const item = {
                  id: option.value,
                  label: presetLabel(option.value, option.name, t),
                  active: option.value === selection.currentValue,
                }
                if (isAuto) {
                  item.badge = t('autoBadge')
                  item.detail = t('autoDescription')
                } else if (option.description !== undefined) {
                  item.detail = option.description
                }
                if (option.value === FULL_ACCESS) {
                  item.confirmation = {
                    title: t('confirmTitle'),
                    description: t('confirmDescription'),
                    acknowledgeLabel: t('confirmAcknowledge'),
                    cancelLabel: t('confirmCancel'),
                    confirmLabel: t('confirmEnable'),
                  }
                }
                return item
              })
            },
            onSelect: (option, session) => submit(session.sessionId, option.id).then(() => undefined),
          },
        }), 'always-auto: /permission popup decoration')
      } catch (error) {
        console.warn('always-auto: could not decorate /permission; the shipped decoration may still be registered', error)
      }
    }

    return { inject: ['commandUi', 'connection', 'sessions', 'slots', 'locale', 'remote', 'remote.permissionPresets', 'configForms'], apply }
  },
})
