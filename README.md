# dsh-always-auto

把 **自动审查（Auto review）** 变成新会话的默认权限，并移除启用它时的实验性风险确认弹窗。

## 它解决什么

DeepSeek Harness 原生的权限界面在选中「自动审查」时会弹出：

> 确认启用自动审查（实验）？

并且「设置 → 通用设置 → 权限」刻意不提供自动审查作为新会话默认值。本插件替换这三处权限界面：

| 位置 | 原生行为 | 本插件 |
|---|---|---|
| 设置 → 通用设置 → 权限 | 只列已配置的 preset | 额外列出「自动审查」，可直接设为新会话默认 |
| 输入框权限选择器 | 选自动审查先弹风险确认 | 直接切换，不再确认 |
| `/permission` 命令弹窗 | 选自动审查先弹风险确认 | 直接切换，不再确认 |
| 完全权限（Full access） | 弹风险确认 | **保持不变**，仍然需要勾选确认 |

自动审查打开后，每次工具调用前的审查、拒绝后的审批行为、`ask`/`never` 策略都与原生实现完全一致；本插件只改选择入口与默认值。

## 界面与原生一致

本插件的两个自定义控件不再自绘下拉菜单和弹窗，而是直接复用 Harness 自带的 UI 基础组件：

- `Menu`：下拉菜单的定位、圆角、背景、描边、悬停态、选中勾选和键盘操作全部由原生组件负责；
- `RiskConfirmation`：完全权限的风险确认弹窗与原生的标题、图标、按钮和遮罩完全一致；
- `PermissionIconReadOnlyRegular` 等权限图标和 `IconChevronDownOutlineRegular` 箭头图标：与原生权限选择器使用同一套图形；
- 行布局、选择器胶囊、输入框触发器与 EXP 角标的样式，逐条照搬原生 `PermissionRow.module.css` 和 `PermissionSelect.module.css` 的声明与主题 token。

因此设置页的权限行、输入框权限选择器在颜色、字体、间距、图标和下拉菜单外观上都与原生控件一致。

## 安装

```sh
dsh plugin --profile web add /absolute/path/to/dsh-always-auto
```

或者把本目录作为本地 bundle 安装：

```text
plugin_manager install_bundle target=/absolute/path/to/dsh-always-auto
```

安装后刷新 Web 页面。插件会：

1. 禁用原生的 `ui-permission` 客户端入口；
2. 插入 `always-auto` 插件入口（Host 半 + Client 半）；
3. 由 Client 半接管上述三个权限界面。

依赖 `@deepseek-ai/dsh-experimental-auto-review` bundle 必须已经安装；否则权限目录里不会出现「自动审查」，本插件也会自动退回到普通默认权限。

## 配置

插件自己的配置只有一个字段，由设置页的「权限」行写入，无需手工编辑：

```yaml
- id: always-auto
  name: dsh-always-auto
  config:
    defaultPreset: auto   # 留空则沿用「权限」行里选中的普通 preset
```

`defaultPreset` 是 `.volatile()` 字段：设置页保存后立即生效，不会重启插件。

## 实现要点

- **Host 半** 在 `permissionPresets.pinInitialPermission` 的调用点上工作：只有真正全新的会话（权限投影里 `preset`、`sandbox`、`approval` 都为空且未 seed）才会被改成 `auto`；恢复、fork 以及已有权限事件的会话保持原值。全新子会话与普通新会话遵循同一默认值。
- **Client 半** 通过 slot 注册接管：
  - `settings.general.item`（复用 `id: permission`，`priority: -1` 遮蔽原生行）；
  - `conversation.input.permission`（`priority: -1` 遮蔽原生单槽）；
  - `commandUi.decorate('permission')` 接管 `/permission` 弹窗的选项。
- 设置页的权限行使用原生 `Menu` 与 `RiskConfirmation`；输入框选择器使用原生 `Menu`、权限图标和方向箭头，菜单向上展开并挂载到 `document.body`，与原生行为一致。
- 自动审查选项在弹窗中不带 `confirmation`；完全权限仍带原生风险确认。
- 样式只使用 `--dsw-*` 主题 token，不依赖任何 Harness Client 包。

## 注意

- 自动审查仍然是无沙箱的同一模型审查，属于实验性功能：可能误放行、误拒绝，并额外消耗 token。
- 本插件通过 `disabled: true` 覆盖原生 `ui-permission` 条目。如果未来的 Harness 重命名该条目，本插件的 slot 注册仍会尝试以更低优先级遮蔽；`/permission` 装饰注册失败时只会打印警告，不会让插件崩溃。
- 本插件不修改会话日志，不写自定义事件；`auto` 仍然通过原生 `permission/preset` 事件记录。

## 验证

离线检查：

```sh
node scripts/verify.mjs
```

它会在 Node `vm` 中加载浏览器半，按模块加载器的形式执行 `factory` 和 `apply`，断言：

- 两个 slot 注册与 `/permission` 装饰仍然生效；
- 设置行和输入框控件使用原生 `Menu`、`RiskConfirmation`、权限图标与箭头图标；
- 输入框菜单向上展开、设置菜单右对齐并挂载到 body；
- 自动审查无确认、完全权限有确认。

Host 半则用假服务断言三种 `pinInitialPermission` 分支。
