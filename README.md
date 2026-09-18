# NFLSHC 账号授权中心（accounts.nflshcchat.cc.cd）

NFLSHC 统一账号授权中心：用户在此登录 / 注册 NFLSHC 账号，并授权第三方应用访问自己的账号信息（类似 OAuth 的授权页）。

## 页面

| 页面 | 地址 | 说明 |
| --- | --- | --- |
| 登录 | `/index.html` | 账号登录、忘记密码（邮箱验证码）、账号申诉 |
| 注册 | `/register.html` | 注册新账号（与主站共用同一套账号体系） |
| 授权 | `/authorize.html?client_id=&redirect_uri=&scope=&state=` | 第三方应用引导用户到此确认授权 |
| 我的授权 | `/apps.html` | 查看并撤销已授权的应用 |

## 授权流程

1. 开发者的应用把用户重定向到：
   `https://accounts.nflshcchat.cc.cd/authorize.html?client_id=<应用ID>&redirect_uri=<回调地址>&scope=profile%20email&state=<随机串>`
2. 用户登录（或注册）后，页面展示该应用请求的信息范围，用户可逐项勾选。
3. 用户点击「同意授权」→ 浏览器跳回 `redirect_uri?code=xxx&state=xxx`。
4. 开发者服务端用 `code + client_id + client_secret` 调 `POST https://worker.nflshcchat.cc.cd/api/oauth/token` 换取 `access_token`。
5. 开发者用 `access_token` 调 `GET /api/oauth/userinfo` 读取用户信息（仅限授权范围内）。

详细接口契约见开发者平台仓库的 `API.md`，或访问 <https://platform.nflshcchat.cc.cd/guide.html>。

## 安全说明

- 账号体系与 nflshcchat 主站共用同一套 D1 数据库；密码以 SHA-256 存储，任何接口都不会返回密码。
- 授权令牌 2 小时有效，可用 `refresh_token`（30 天）刷新；用户在「我的授权」撤销后令牌立即失效。
- 开发者无法通过开放平台接口修改用户在主站的账号状态（封禁 / 冻结 / 密码）。

## 部署

纯静态站点，部署在 GitHub Pages，自定义域名 `accounts.nflshcchat.cc.cd`（仓库根目录 `CNAME` 文件 + DNS CNAME 记录指向 `user-henry.github.io`）。

## 技术栈

原生 HTML / CSS / JavaScript，无构建步骤、无第三方依赖。
- `js/theme.js`：主题管理（5 套配色）+ Bearer Token 存取 + 请求包装
- `js/api.js`：API 封装与通用工具（转义、SHA-256、Toast、会话校验）
- `css/themes.css` / `css/app.css`：主题变量与站点样式
