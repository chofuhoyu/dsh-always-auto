# AGENTS.md

本仓库是个人 DSH 插件，通过 GitHub 分发；DSH 插件市场索引按 git 标签加默认分支枚举版本。

## 发布规则

**发布版本时，必须在该版本 `package.json` 声明的提交上创建并推送标签 `v<version>`。**

- 标签名：`v` 加规范 SemVer，例如 `v0.1.2`。
- 标签必须打在 `package.json` 的 `version` 恰好等于该值的提交上，通常是 `[release] Bump the package version to X` 提交。
- 分支推完后单独推标签：`git push origin v0.1.2`。
- 已发布的标签永不移动、永不删除；版本写错就发新版本，不要改旧标签。

### 为什么

- 市场索引生成器按标签枚举版本：版本提交没有标签，该版本就不进索引；旧版本没标签时，索引里只剩默认分支上的最新版本，旧版本会从中消失。
- 标签若不在声明该版本的提交上，版本号就会随分支漂移到更晚的代码，索引里的版本与实际内容不一致。

## 发布清单

1. 改 `package.json` 的 `version`；
2. 提交（`[release] Bump the package version to X`）；
3. 打标签：`git tag -a vX -m "vX"`；
4. 推送分支和标签：`git push origin main && git push origin vX`。
