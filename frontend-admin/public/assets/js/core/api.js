/**
 * 🛰️ OTAKU CLASH ANGOLA - API CORE CLIENT
 * Versão: 2.1.0 - Resilient Auth Flow
 * Descrição: Gerenciador de requisições Axios com interceptors e proteção de fluxo de login.
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
 */
apiClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // 🚨 CASO ESPECIAL: Se o erro 401 ocorrer na rota de LOGIN, NÃO fazemos logout nem refresh
        if (originalRequest.url.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // 1. TRATAMENTO DE TOKEN EXPIRADO EM ROTAS PROTEGIDAS (401)
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            
            // Se já for uma tentativa de refresh que falhou, encerra a sessão
            if (originalRequest.url.includes('/auth/refresh')) {
                if (window.Auth) window.Auth.logout();
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                const refreshToken = window.Auth ? window.Auth.getRefreshToken() : localStorage.getItem('oc_admin_refresh_token');
                
                if (!refreshToken) {
                    if (window.Auth) window.Auth.logout();
                    return Promise.reject(error);
                }

                // Chamada de renovação
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken: refreshToken
                });

                if (refreshResponse.data && refreshResponse.data.status === 'success') {
                    const newAccessToken = refreshResponse.data.data.accessToken;
                    
                    if (window.Auth) {
                        window.Auth.saveSession({ accessToken: newAccessToken }, window.Auth.getUser());
                    } else {
                        localStorage.setItem('oc_admin_access_token', newAccessToken);
                    }

                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                if (window.Auth) window.Auth.logout();
                return Promise.reject(refreshError);
            }
        }

        // 2. FORMATAÇÃO DE MENSAGENS DE ERRO PARA O UI
        let errorMessage = 'Ocorreu um erro na comunicação com o servidor.';
        
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || errorMessage;
        }

        // Só exibe alerta automático se não for login (o login trata seu próprio erro)
        if (!originalRequest.url.includes('/auth/login') && !originalRequest.silent) {
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
 */
window.API = {
    get: (url, config = {}) => apiClient.get(url, config),
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    delete: (url, config = {}) => apiClient.delete(url, config)
};

console.log('[API] Motor de integração sincronizado.');
