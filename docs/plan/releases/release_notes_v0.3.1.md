# Release Notes — v0.3.1

这是一个部署兼容性热修版本，主要解决“未显式配置 `NEXTAUTH_SECRET` 时，容器可能因启动策略过严而影响开箱可用性”的问题。

## ✅ 主要修复

### 部署兼容性修复
- `NEXTAUTH_SECRET` 从“强制必须提供”调整为“可选，缺失时自动生成临时值”
- `docker-compose.yml` 不再强制要求必须传入 `NEXTAUTH_SECRET`
- `README` 补充说明：
  - 未配置时仍可启动
  - 但重启/重建容器后 session 可能失效
  - 生产环境仍建议显式配置稳定 secret

## 为什么之前要加这个限制

NextAuth 需要 `NEXTAUTH_SECRET` 来签名和校验认证相关数据。没有它，认证链路会变得不稳定，或者出现 warning / 问题。

之前之所以做成“必须配置”，是为了避免线上继续使用固定弱默认值（如 `change-me-in-prod`）。

## 为什么现在又放宽

因为对于自部署 / 先跑起来再说的场景：
- “起不来” 比 “session 重启后失效” 更影响使用
- 所以现在改成：
  - **优先保证能启动**
  - 同时保留 warning，提醒生产环境显式配置

## 建议

生产环境仍推荐显式设置：

```env
NEXTAUTH_SECRET=<your-stable-random-secret>
```
