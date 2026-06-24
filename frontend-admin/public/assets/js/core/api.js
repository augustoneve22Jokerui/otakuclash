/**
 * 🔗 OTAKU CLASH ANGOLA - API CORE CLIENT
 * Versão: 2.1.2 - Sincronização de Estado de Refresh & Resilient Auth Flow
 * Descrição: Gerenciador de requisições Axios com interceptors, proteção contra loops e tratamento visual de erros.
 */

const API_BASE_URL = window.API_URL || 'https://otakuclashaangola.onrender.com/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-App-Version': window.APP_VERSION || '2.0.0'
    }
});

/**
 * 🔒 INTERCEPTOR DE REQUISIÇÃO
 * Injeta dinamicamente o Bearer Token antes do disparo de qualquer rota.
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = window.Auth ? window.Auth.getAccessToken() : localStorage.getItem('oc_admin_access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * 🔓 INTERCEPTOR DE RESPOSTA
 * Gerencia erros de forma centralizada, intercepta expirações de sessão (401) e executa o auto-refresh.
 */
apiClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // 🚨 CASO ESPECIAL: Se o erro ocorrer na rota de login, não fazemos logout nem refresh
        if (originalRequest.url.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // 1. TRATAMENTO DE TOKEN EXPIRADO EM ROTAS PROTEGIDAS (401)
        if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
            
            // Se já for uma tentativa de refresh que falhou, encerra a sessão imediatamente
            if (originalRequest.url.includes('/auth/refresh')) {
                if (window.Auth) window.Auth.logout();
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                let success = false;

                // Executa a renovação sincronizada pelo AuthManager se disponível, ou fallback direto
                if (window.Auth && typeof window.Auth.refreshSession === 'function') {
                    success = await window.Auth.refreshSession();
                } else {
                    const rToken = localStorage.getItem('oc_admin_refresh_token');
                    if (!rToken) {
                        localStorage.removeItem('oc_admin_access_token');
                        return Promise.reject(error);
                    }

                    const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken: rToken
                    });

                    if (refreshResponse.data && refreshResponse.data.status === 'success') {
                        const newAccessToken = refreshResponse.data.data.accessToken;
                        localStorage.setItem('oc_admin_access_token', newAccessToken);
                        success = true;
                    }
                }

                // Se o refresh obteve sucesso, refaz a requisição original com o novo token
                if (success) {
                    const newToken = localStorage.getItem('oc_admin_access_token');
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                if (window.Auth) window.Auth.logout();
                return Promise.reject(refreshError);
            }
        }

        // 2. FORMATAÇÃO E EXIBIÇÃO DE MENSAGENS DE ERRO PARA O UI (SWEETALERT2)
        // Só exibe o alerta automático se não for login e se a requisição não pedir silêncio (silent: true)
        if (!originalRequest.url.includes('/auth/login') && !originalRequest.silent) {
            let errorMessage = 'Ocorreu um erro na comunicação com o servidor.';
            
            if (error.response && error.response.data) {
                errorMessage = error.response.data.message || errorMessage;
            }

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Erro na Operação',
                    text: errorMessage,
                    icon: 'error',
                    background: '#131320',
                    color: '#FFFFFF',
                    confirmButtonColor: '#FF3B5C'
                });
            }
        }

        return Promise.reject(error);
    }
);

/**
 * 🛠️ EXPOSIÇÃO DO WRAPPER GLOBAL
 * Atalhos limpos mapeados para o escopo global da aplicação.
 */
window.API = {
    get: (url, config = {}) => apiClient.get(url, config),
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    delete: (url, config = {}) => apiClient.delete(url, config)
};

console.log('[API] Motor de integração sincronizado.');
