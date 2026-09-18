/**
 * NFLSHC 账号授权中心 · 公共 API 与工具
 * 依赖：js/theme.js（提供 window.AuthToken / window.ThemeManager）
 */
(function () {
    'use strict';

    window.NFLSHC = window.NFLSHC || {};

    // ================= 常量 =================
    var API_BASE = 'https://worker.nflshcchat.cc.cd';
    var USER_KEY = 'nflshc_currentUser';

    window.NFLSHC.API_BASE = API_BASE;

    // ================= 工具函数 =================
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function hashPassword(password) {
        var data = new TextEncoder().encode(password);
        var buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    function toast(message, type) {
        var el = document.getElementById('nflshcToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'nflshcToast';
            el.style.cssText = 'position:fixed;left:50%;bottom:36px;transform:translate(-50%,20px);' +
                'padding:12px 20px;border-radius:12px;font-size:14px;z-index:9999;opacity:0;' +
                'transition:all .28s ease;pointer-events:none;max-width:80vw;text-align:center;' +
                'box-shadow:0 12px 32px rgba(0,0,0,.45);border:1px solid var(--border-color);' +
                'background:var(--bg-secondary);color:var(--text-primary);';
            document.body.appendChild(el);
        }
        var colors = { success: 'var(--success, #2ecc71)', error: 'var(--danger, #e74c3c)', warning: 'var(--warning, #f39c12)', info: 'var(--accent-color)' };
        el.style.borderColor = colors[type] || colors.info;
        el.innerHTML = escapeHtml(message);
        el.style.opacity = '1';
        el.style.transform = 'translate(-50%,0)';
        clearTimeout(el.__timer);
        el.__timer = setTimeout(function () {
            el.style.opacity = '0';
            el.style.transform = 'translate(-50%,20px)';
        }, 2600);
    }

    // ================= 会话 =================
    function currentUser() {
        try {
            var raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem('currentUser');
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function saveUser(user) {
        try {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            sessionStorage.setItem('currentUser', JSON.stringify(user));
        } catch (e) { /* 忽略 */ }
    }

    function clearUser() {
        try {
            localStorage.removeItem(USER_KEY);
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('nflshc_user');
        } catch (e) { /* 忽略 */ }
        if (window.AuthToken) window.AuthToken.clear();
    }

    // 校验当前 token 是否仍然有效（服务端确认）
    async function validateSession() {
        var token = window.AuthToken && window.AuthToken.get();
        var user = currentUser();
        if (!token || !user || !user.username) return null;
        try {
            var res = await fetch(API_BASE + '/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
            if (!res.ok) { clearUser(); return null; }
            var data = await res.json().catch(function () { return {}; });
            if (data && data.valid === false) { clearUser(); return null; }
            return user;
        } catch (e) {
            return user; // 网络异常时保留本地会话
        }
    }

    // ================= 请求封装 =================
    async function request(path, options) {
        options = options || {};
        var headers = new Headers(options.headers || {});
        var token = window.AuthToken && window.AuthToken.get();
        if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
        if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        var res = await fetch(API_BASE + path, {
            method: options.method || 'GET',
            headers: headers,
            body: options.body
        });
        var data = null;
        try { data = await res.json(); } catch (e) { data = {}; }
        if (!res.ok) {
            var err = new Error((data && (data.error_description || data.error || data.message)) || ('请求失败 (HTTP ' + res.status + ')'));
            err.status = res.status;
            err.data = data || {};
            throw err;
        }
        return data || {};
    }

    // ================= OAuth 相关接口 =================
    var OAuth = {
        scopes: function () { return request('/api/oauth/scopes'); },

        authorizeInfo: function (clientId, redirectUri, scope) {
            var qs = '?client_id=' + encodeURIComponent(clientId) +
                '&redirect_uri=' + encodeURIComponent(redirectUri || '') +
                '&scope=' + encodeURIComponent(scope || '');
            return request('/api/oauth/authorize-info' + qs);
        },

        authorize: function (payload) {
            return request('/api/oauth/authorize', { method: 'POST', body: JSON.stringify(payload) });
        },

        grants: function () { return request('/api/oauth/grants'); },

        revoke: function (clientId) {
            return request('/api/oauth/grants/' + encodeURIComponent(clientId), { method: 'DELETE' });
        }
    };

    // ================= 账号接口（与主站共用） =================
    var Account = {
        login: function (username, passwordHash) {
            return request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: username, password: passwordHash })
            });
        },
        register: function (username, passwordHash, email) {
            var payload = {
                username: username,
                password: passwordHash,
                passwordHashed: true,
                email: email,
                createdAt: new Date().toISOString()
            };
            var body = '用户信息\n```json\n' + JSON.stringify(payload, null, 2) + '\n```';
            return request('/api/legacy/issues?labels=user', {
                method: 'POST',
                body: JSON.stringify({ body: body, labels: ['user'] })
            });
        },
        forgot: function (username, email) {
            var cfg = {
                serviceId: 'service_6iugtla',
                templateId: 'template_03vba8b',
                publicKey: 'A-3y5AHO_oj3PQU5l'
            };
            return request('/api/auth/forgot', {
                method: 'POST',
                body: JSON.stringify({
                    username: username, email: email,
                    serviceId: cfg.serviceId, templateId: cfg.templateId, publicKey: cfg.publicKey
                })
            });
        },
        verifyReset: function (username, code) {
            return request('/api/auth/verify-reset', {
                method: 'POST',
                body: JSON.stringify({ username: username, code: code })
            });
        },
        appeal: function (username, reason) {
            return request('/api/auth/appeal', {
                method: 'POST',
                body: JSON.stringify({ username: username, reason: reason })
            });
        },
        me: function () { return request('/api/auth/me'); }
    };

    window.NFLSHC.util = {
        escapeHtml: escapeHtml,
        hashPassword: hashPassword,
        toast: toast,
        currentUser: currentUser,
        saveUser: saveUser,
        clearUser: clearUser,
        validateSession: validateSession
    };
    window.NFLSHC.request = request;
    window.NFLSHC.OAuth = OAuth;
    window.NFLSHC.Account = Account;
})();
