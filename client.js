/**
 * dsh-always-auto client half.
 *
 * Replaces the shipped permission surfaces (the General-settings row, the
 * composer picker, and the /permission popup) so that:
 *   - Auto review is offered as the new-session default in Settings > General.
 *   - Selecting Auto never opens the experimental-enable risk confirmation.
 *   - Full access keeps its risk confirmation.
 *
 * The two custom controls are built from the shipped UI primitives and copy the
 * shipped permission surfaces' token set, so their colors, glyphs, spacing, and
 * dropdown chrome match the native selectors exactly.
 */
window.__ModuleLoader__.load({
  id: 'dsh-always-auto',
  factory(require) {
    const React = require('react')
    const {
      IconChevronDownOutlineRegular,
      Menu,
      PermissionIconAutoReviewRegular,
      PermissionIconFullAccessRegular,
      PermissionIconReadOnlyRegular,
      PermissionIconWorkspaceWriteRegular,
      RiskConfirmation,
    } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement

    const NS = 'always-auto'
    const AUTO = 'auto'
    const FULL_ACCESS = 'danger-full-access'

    const PRESET_LABEL_KEYS = {
      'read-only': 'presetReadOnly',
      'workspace-write': 'presetWorkspaceWrite',
      'danger-full-access': 'presetFullAccess',
    }

    const PERMISSION_GLYPHS = {
      'read-only': PermissionIconReadOnlyRegular,
      'workspace-write': PermissionIconWorkspaceWriteRegular,
      'danger-full-access': PermissionIconFullAccessRegular,
      auto: PermissionIconAutoReviewRegular,
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
      confirmTitle: '确认启用完全权限？',
      confirmDescription: '启用完全权限后，智能体将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。',
      settingsConfirmDescription: '启用完全权限后，新会话将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任后续任务时使用。',
      confirmAcknowledge: '我已了解风险，并愿意继续',
      confirmCancel: '取消',
      confirmEnable: '启用完全权限',
      mode: '访问模式，当前：{name}',
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
      confirmTitle: 'Enable Full access?',
      confirmDescription: 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.',
      settingsConfirmDescription: 'Full access lets new sessions reduce confirmation steps and perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust subsequent tasks.',
      confirmAcknowledge: 'I understand the risks and want to continue',
      confirmCancel: 'Cancel',
      confirmEnable: 'Enable Full access',
      mode: 'Access mode, current: {name}',
      close: 'Close',
    }

    /*
     * These rules are the shipped PermissionRow.module.css and
     * PermissionSelect.module.css declarations with local class names. Keeping
     * the same tokens, sizes, and breakpoints is what makes the custom controls
     * indistinguishable from the native selectors.
     */
    const CSS = `
.dsh-aa-row{display:flex;align-items:center;gap:8px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.dsh-aa-rowText{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding-right:48px}
@media (max-width:767px){html:not([data-windows-titlebar]):not([data-platform='darwin']) .dsh-aa-rowText{padding-right:16px}}
.dsh-aa-title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dsh-aa-desc{font-size:12px;font-weight:400;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsh-aa-selector{display:inline-flex;align-items:center;gap:12px;height:36px;padding:0 14px;border:none;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform);font:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);cursor:pointer}
@media (hover:hover){.dsh-aa-selector:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-aa-selector:disabled{cursor:default}
.dsh-aa-rowChevron{flex:none}
.dsh-aa-trigger{display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:220px;height:28px;padding:0 4px 0 8px;border:none;border-radius:var(--dsw-radius-sm);outline:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;font-weight:500;cursor:pointer}
@media (hover:hover){.dsh-aa-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-aa-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.dsh-aa-trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
.dsh-aa-triggerIcon{display:inline-flex;flex:0 0 auto}
.dsh-aa-triggerIcon svg{width:14px;height:14px}
.dsh-aa-triggerLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-aa-optionLabel{display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:100%}
.dsh-aa-optionLabelText{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-aa-badge{flex:none;color:var(--dsw-alias-label-tertiary);font-size:8px;line-height:10px;font-weight:500;letter-spacing:.2px}
.dsh-aa-triggerChevron{display:inline-flex;flex:0 0 auto;color:var(--dsw-alias-label-caption);transition:transform 120ms ease}
@container (max-width:460px){.dsh-aa-trigger:has(.dsh-aa-triggerIcon) .dsh-aa-triggerLabel{display:none}}
.dsh-aa-triggerChevronOpen{transform:rotate(180deg)}
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

    function cx(...values) {
      return values.filter(Boolean).join(' ')
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

    /** The shipped permission glyph for a preset value; host-configured names get none. */
    function permissionGlyph(value) {
      const Icon = PERMISSION_GLYPHS[value]
      return Icon === undefined ? undefined : h(Icon)
    }

    /** Auto owns its description; every other preset keeps the host-supplied copy. */
    function optionDescription(option, t) {
      return option.value === AUTO ? t('autoDescription') : option.description
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

    /**
     * Composer menu rows: the shipped icon column plus the localized EXP badge.
     * The menu itself supplies the selected row's trailing check.
     */
    function pickerItems(options, t) {
      return options.map((option) => {
        const icon = permissionGlyph(option.value)
        const label = presetLabel(option.value, option.name, t)
        const badge = option.value === AUTO ? t('autoBadge') : undefined
        const item = {
          id: option.value,
          label: badge === undefined
            ? label
            : h('span', {
              className: 'dsh-aa-optionLabel',
              'aria-label': `${label} ${badge}`,
            },
            h('span', { className: 'dsh-aa-optionLabelText' }, label),
            h('span', { className: 'dsh-aa-badge' }, badge)),
        }
        if (icon !== undefined) item.icon = icon
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
      const [acknowledged, setAcknowledged] = React.useState(false)

      React.useEffect(() => {
        if (permission.writable && permission.status !== 'unavailable') return
        setOpen(false)
        setAcknowledged(false)
        setConfirming(false)
      }, [permission.status, permission.writable])

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
          : t('unavailable')
      const description = error ?? catalogState.error ?? t('description')
      const disabled = busy || confirming || loading || !permission.writable || options.length === 0

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
          setAcknowledged(false)
          setConfirming(true)
          return
        }
        void submitDefault(value)
      }

      const items = options.map((option) => ({
        id: option.value,
        label: presetLabel(option.value, option.name, t),
      }))

      return h(React.Fragment, null,
        h('div', { className: 'dsh-aa-row' },
          h('div', { className: 'dsh-aa-rowText' },
            h('div', { className: 'dsh-aa-title' }, t('title')),
            h('div', {
              className: 'dsh-aa-desc',
              role: error !== null || catalogState.error !== null ? 'alert' : undefined,
            }, description)),
          h(Menu, {
            open,
            onClose: () => {
              setOpen(false)
            },
            items,
            selectedId: currentValue,
            onSelect: choose,
            align: 'end',
            portal: true,
            anchor: h('button', {
              type: 'button',
              className: 'dsh-aa-selector',
              'aria-haspopup': 'menu',
              'aria-expanded': open,
              disabled,
              onClick: () => {
                setOpen((value) => !value)
              },
            }, label, h(IconChevronDownOutlineRegular, { className: 'dsh-aa-rowChevron' })) }),
        ),
        h(RiskConfirmation, {
          open: confirming,
          title: t('confirmTitle'),
          description: t('settingsConfirmDescription'),
          acknowledgeLabel: t('confirmAcknowledge'),
          cancelLabel: t('confirmCancel'),
          closeLabel: t('close'),
          confirmLabel: t('confirmEnable'),
          acknowledged,
          disabled: busy || !permission.writable,
          onAcknowledgedChange: setAcknowledged,
          onCancel: () => {
            setAcknowledged(false)
            setConfirming(false)
          },
          onConfirm: () => {
            setAcknowledged(false)
            setConfirming(false)
            void submitDefault(FULL_ACCESS)
          },
        }))
    }

    /** Composer control: the current session's permission. */
    function PermissionPicker({ t, locked, select, catalogStore, useProjection }) {
      const selection = useProjection('permissions')
      const catalogState = useStore(catalogStore)
      const [pick, setPick] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [confirmation, setConfirmation] = React.useState(null)
      const [acknowledged, setAcknowledged] = React.useState(false)

      React.useEffect(() => {
        const catalog = catalogState.value
        if (!locked && selection !== undefined && catalog !== null
          && (confirmation === null || catalog.options.some((option) => option.value === confirmation))) return
        setOpen(false)
        setAcknowledged(false)
        setConfirmation(null)
      }, [catalogState.value, confirmation, locked, selection])

      if (selection === undefined || catalogState.value === null) return null

      const catalog = catalogState.value
      const currentValue = pick !== null && catalog.options.some((option) => option.value === pick)
        ? pick
        : selection.currentValue
      const current = catalog.options.find((option) => option.value === currentValue)
      const currentLabel = current === undefined
        ? presetLabel(currentValue, currentValue, t)
        : presetLabel(current.value, current.name, t)
      const busy = pick !== null || confirmation !== null

      const submit = (value) => {
        setPick(value)
        void select(value)
          .catch((error) => {
            console.warn('always-auto: permission switch failed', error)
            return false
          })
          .then(() => {
            setPick(null)
          })
      }

      const choose = (value) => {
        setOpen(false)
        if (value === selection.currentValue) return
        if (value === FULL_ACCESS) {
          setAcknowledged(false)
          setConfirmation(value)
          return
        }
        submit(value)
      }

      const closeConfirmation = () => {
        setAcknowledged(false)
        setConfirmation(null)
      }

      return h(React.Fragment, null,
        h(Menu, {
          open,
          items: pickerItems(catalog.options, t),
          selectedId: currentValue,
          onSelect: choose,
          onClose: () => {
            setOpen(false)
          },
          side: 'top',
          portal: true,
          anchor: h('button', {
            type: 'button',
            className: 'dsh-aa-trigger',
            'aria-label': t('mode', { name: currentLabel }),
            title: current === undefined ? undefined : optionDescription(current, t),
            disabled: locked || busy,
            onClick: () => {
              setOpen(!open)
            },
          },
          permissionGlyph(currentValue) !== undefined && h('span', {
            className: 'dsh-aa-triggerIcon',
            'aria-hidden': true,
          }, permissionGlyph(currentValue)),
          h('span', { className: 'dsh-aa-triggerLabel' }, currentLabel),
          h('span', {
            className: cx('dsh-aa-triggerChevron', open && 'dsh-aa-triggerChevronOpen'),
            'aria-hidden': true,
          }, h(IconChevronDownOutlineRegular))),
        }),
        h(RiskConfirmation, {
          open: confirmation !== null,
          title: t('confirmTitle'),
          description: t('confirmDescription'),
          acknowledgeLabel: t('confirmAcknowledge'),
          cancelLabel: t('confirmCancel'),
          closeLabel: t('close'),
          confirmLabel: t('confirmEnable'),
          acknowledged,
          disabled: locked,
          onAcknowledgedChange: setAcknowledged,
          onCancel: closeConfirmation,
          onConfirm: () => {
            const value = confirmation
            closeConfirmation()
            if (value !== null) submit(value)
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
