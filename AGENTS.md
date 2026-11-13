# AGENTS.md

本仓库是个人 DSH 插件，通过 GitHub 分发；DSH 插件市场索引按 git 标签加默认分支枚举版本。

## 发布规则

**发布版本时，必须在该版本 `package.json` 声明的提交上创建并推送标签 `v<version>`。**

- 标签名：`v` 加规范 SemVer，例如 `v0.1.2`。
- 标签必须打在 `package.json` 的 `version` 恰好等于该值的提交上，通常是 `[release] Bump the package version to X` 提交。
- 分支推完后单独推标签：`git push origin v0.1.2`。
- 已发布的标签永不移动、永不删除；版本写错就发新版本，不要改旧标签。

### 为什么

- 市场索引生成器列出打了标签的版本和默认分支上的当前版本：没有标签的旧版本会从索引里消失，索引里只剩默认分支上的最新版本。
- 当前版本没有标签时，版本号会随默认分支前进漂移到更晚的代码，索引里的版本与实际内容不一致。

## 发布清单

1. 改 `package.json` 的 `version`；
2. 提交（`[release] Bump the package version to X`）；
3. 打标签：`git tag -a v<version> -m "v<version>"`；
4. 推送分支和标签：`git push origin main && git push origin v<version>`。
