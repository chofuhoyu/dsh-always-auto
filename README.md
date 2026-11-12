# dsh-always-auto

English | [中文](README.zh.md)

Makes **Auto review** the default permission for new sessions and removes the
experimental-enable risk confirmation when users select it.

## What it changes

The stock permission surfaces ask for a risk acknowledgement when Auto review
is selected, and Settings → General → Permissions never offers Auto as a
new-session default. This plugin replaces those three surfaces:

| Surface | Stock behavior | This plugin |
|---|---|---|
| Settings → General → Permissions | Configured presets only | Also lists Auto review and saves it as the new-session default |
| Composer permission picker | Confirms before switching to Auto | Switches immediately |
| `/permission` popup | Confirms before switching to Auto | Switches immediately |
| Full access | Risk confirmation | **Unchanged**: still requires acknowledgement |

Tool-call review, denial handling, and the `ask` / `never` policies remain the
stock Auto review implementation. Only the selection entry points and the
new-session default change.

## Install

```sh
dsh plugin --profile web add /absolute/path/to/dsh-always-auto
```

Or install the directory as a local bundle through Plugin Manager. Refresh the
Web page afterwards.

The `@deepseek-ai/dsh-experimental-auto-review` bundle must already be
installed; without it the permission catalog does not offer Auto and this
plugin falls back to the ordinary default.

## Configuration

The plugin has one field, written by the Permissions row:

```yaml
- id: always-auto
  name: dsh-always-auto
  config:
    defaultPreset: auto   # empty defers to the ordinary permission default
```

`defaultPreset` is `.volatile()`, so saving in Settings applies without
restarting the plugin.

## How it works

- **Host half** wraps `permissionPresets.pinInitialPermission`: only a truly
  fresh session (empty `preset`, `sandbox`, and `approval`, not seeded) is
  switched to `auto`. Restored, forked, and explicitly configured sessions keep
  their own permission; a fresh child session follows the same default.
- **Client half** takes over the slots:
  - `settings.general.item` (`id: permission`, `priority: -1`, shadowing the
    shipped row);
  - `conversation.input.permission` (`priority: -1`, shadowing the shipped
    single slot);
  - the `permission` command decoration for the `/permission` popup.
- The Auto option carries no `confirmation`; Full access keeps the native risk
  gate.
- Styles use only `--dsw-alias-*` theme tokens and no Harness Client package.

## Caveats

- Auto review is experimental and sandbox-free: it can falsely allow or deny
  actions and spends additional tokens.
- The bundle disables the shipped `ui-permission` client row. If a future
  Harness renames that row, the client registrations still try to shadow it by
  priority; a failed `/permission` decoration is logged and never crashes the
  plugin.
- No custom session events or log fields are added; Auto is still recorded as
  the native `permission/preset` event.

## Verify

```sh
node scripts/verify.mjs
```

The script evaluates the browser half exactly like the module loader, runs
`apply` against a fake Client context, and asserts the two slot registrations,
the `/permission` decoration, the absence of an Auto confirmation, and the
presence of the Full-access confirmation. The Host half runs against a fake
permission service covering the fresh, restored, and Auto-unavailable branches.
