/**
 * 🔐 OTAKU CLASH ANGOLA - AUTHENTICATION MANAGER
 * Versão: 2.2.1 - UTF-8 Robust Decode & Stable Redirection Edition
 * Descrição: Orquestrador de identidade, gerenciamento de sessões, interceptação e proteção de rotas no front-end.
 */

const AuthManager = {
    // Chaves de armazenamento persistente no LocalStorage
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'oc_admin_access_token',
        REFRESH_TOKEN: 'oc_admin_refresh_token',
        USER_DATA: 'oc_admin_user_info'
    },

    /**
     * 💾 SALVA SESSÃO (PERSISTÊNCIA PÓS-LOGIN)
     * @param {Object} tokens - { accessToken, refreshToken }
     * @param {Object} user - Dados do perfil administrativo
     */
    saveSession(tokens, user) {
        try {
            if (!tokens || !tokens.accessToken) {
                console.error('[Auth] Erro: Tentativa de salvar sessão sem token válido.');
                return false;
            }

            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
            
            if (tokens.refreshToken) {
                localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
            }

            if (user) {
                localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
            }

            console.log('[Auth] Sessão administrativa persistida com sucesso.');
            return true;
        } catch (error) {
            console.error('[Auth] Erro ao acessar localStorage no saveSession:', error);
            return false;
        }
    },

    /**
     * 🎟️ RECUPERA ACCESS TOKEN (JWT)
     */
    getAccessToken() {
        return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    },

    /**
     * 🔄 RECUPERA REFRESH TOKEN
     */
    getRefreshToken() {
        return localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * 👤 RECUPERA DADOS DO UTILIZADOR LOGADO
     */
    getUser() {
        const user = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
        try {
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error('[Auth] Erro ao realizar o parse dos dados do utilizador.');
            return null;
        }
    },

    /**
     * ✅ VERIFICA INTEGRIDADE E EXPIRAÇÃO DA SESSÃO (CLIENT-SIDE)
     * Realiza a decodificação robusta do JWT em UTF-8 para evitar quebras com caracteres especiais angolanos.
     */
    isAuthenticated() {
        const token = this.getAccessToken();
        if (!token || token === 'undefined' || token === 'null') return false;

        try {
            // Separa a parte do payload do JWT (Base64Url)
            const base64Url = token.split('.')[1];
            if (!base64Url) return false;

            // Substituição de caracteres Base64Url para Base64 padrão e decodificação UTF-8 robusta
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);
            const now = Math.floor(Date.now() / 1000);

            // Verifica se o token ainda é válido (com margem de segurança de 10 segundos)
            return payload.exp > (now + 10);
        } catch (e) {
            console.error('[Auth] Falha na validação e decodificação do token local:', e);
            return false;
        }
    },

    /**
     * 🚪 LOGOUT (ENCERRAMENTO DE SESSÃO)
     * Limpa o storage, mata conexões WebSocket ativas e redireciona de forma limpa.
     */
    logout() {
        console.log('[Auth] Encerrando sessão administrativa...');
        
        // 1. Limpa chaves de segurança do armazenamento local
        localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        
        // 2. Desconecta o Socket.IO de forma resiliente se estiver instanciado na janela global
        if (window.Socket && typeof window.Socket.disconnect === 'function') {
            window.Socket.disconnect();
        }

        // 3. Redireciona para o login de forma atômica substituindo o histórico
        if (window.location.pathname !== '/login') {
            window.location.replace('/login');
        }
    },

    /**
     * 🛡️ PROTEÇÃO DE ROTA (ROUTE GUARD)
     * Controla o fluxo de redirecionamento imediato para evitar loops de renderização.
     */
    checkAuth() {
        const path = window.location.pathname;
        const isLoginPage = path === '/login' || path === '/';
        const authenticated = this.isAuthenticated();

        // Cenário A: Utilizador não autenticado tentando acessar o painel restrito
        if (!authenticated && !isLoginPage) {
            console.warn('[Auth] Acesso restrito: Identidade expirada ou ausente.');
            return this.logout();
        }

        // Cenário B: Utilizador já autenticado tentando forçar visualização da tela de login
        if (authenticated && isLoginPage) {
            console.log('[Auth] Utilizador já autenticado. Redirecionando para o Dashboard.');
            window.location.replace('/dashboard');
        }
    },

    /**
     * ✍️ ATUALIZADOR DE ESTADO LOCAL
     * Sincroniza mudanças em tempo real no perfil sem mutar dados antigos desnecessariamente.
     */
    updateUserData(newData) {
        const current = this.getUser();
        if (current) {
            const updated = { ...current, ...newData };
            localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(updated));
            return updated;
        }
        return null;
    },

    /**
     * ♻️ RENOVAÇÃO MANUAL DE SESSÃO (REFRESH TOKEN)
     * Executado de forma isolada via Axios para prevenir loops infinitos em interceptors globais.
     */
    async refreshSession() {
        const rToken = this.getRefreshToken();
        if (!rToken) return this.logout();

        try {
            // Chamada direta utilizando a URL injetada no escopo global
            const response = await axios.post(`${window.API_URL}/auth/refresh`, {
                refreshToken: rToken
            });

            if (response.data && response.data.status === 'success') {
                const newAccess = response.data.data.accessToken;
                localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, newAccess);
                console.log('[Auth] Token de acesso renovado com sucesso.');
                return true;
            }
            throw new Error('Refresh rejeitado pelo servidor.');
        } catch (err) {
            console.error('[Auth] Falha crítica ao renovar sessão via Refresh Token:', err.message);
            this.logout();
            return false;
        }
    }
};

/**
 * ⚡ EXECUÇÃO DE SEGURANÇA IMEDIATA
 * Intercepta e valida as rotas de forma agressiva antes do carregamento total do DOM (Bloqueio de tela branca).
 */
AuthManager.checkAuth();

// Expõe a instância globalmente para consumo de scripts externos e componentes de interface
window.Auth = AuthManager;
