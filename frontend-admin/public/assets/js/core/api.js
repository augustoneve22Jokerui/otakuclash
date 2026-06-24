/**
 * 🛰️ OTAKU CLASH ANGOLA - API CORE CLIENT
 * Versão: 2.0.0 - Enterprise Resilience
 * Descrição: Gerenciador de requisições Axios com interceptors de segurança e refresh.
 */

const API_BASE_URL = window.API_URL || 'https://otakuclashaangola.onrender.com/api/v1';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000, // 20 segundos de timeout
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-App-Version': window.APP_VERSION || '2.0.0'
    }
});

/**
 * 🔒 INTERCEPTOR DE REQUISIÇÃO
 * Garante que o token de acesso seja enviado em cada chamada protegida.
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = window.Auth ? window.Auth.getAccessToken() : localStorage.getItem('oc_admin_access_token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * 🔓 INTERCEPTOR DE RESPOSTA
 * Gerencia sucesso, renovação de token e formatação de erros globais.
 */
apiClient.interceptors.response.use(
    (response) => {
        // Retorna apenas o corpo da resposta para simplificar o uso nos módulos
        // O backend Clean Architecture retorna { status, message, data }
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // 1. TRATAMENTO DE TOKEN EXPIRADO (401)
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            
            // Se a falha for na própria rota de login ou refresh, não tenta novamente
            if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh')) {
                if (window.Auth) window.Auth.logout();
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            console.log('[API] Token expirado. Tentando renovação...');

            try {
                const refreshToken = window.Auth ? window.Auth.getRefreshToken() : localStorage.getItem('oc_admin_refresh_token');
                
                if (!refreshToken) {
                    throw new Error('Nenhum Refresh Token disponível.');
                }

                // Chamada de refresh para o backend
                const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken: refreshToken
                });

                if (refreshResponse.data && refreshResponse.data.status === 'success') {
                    const newAccessToken = refreshResponse.data.data.accessToken;
                    
                    // Atualiza a persistência local
                    if (window.Auth) {
                        window.Auth.saveSession({ accessToken: newAccessToken }, window.Auth.getUser());
                    } else {
                        localStorage.setItem('oc_admin_access_token', newAccessToken);
                    }

                    // Atualiza o header da requisição original e a re-executa
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                console.error('[API] Falha crítica no refresh da sessão:', refreshError);
                if (window.Auth) window.Auth.logout();
                return Promise.reject(refreshError);
            }
        }

        // 2. FORMATAÇÃO DE MENSAGEM DE ERRO
        let errorMessage = 'Ocorreu um erro na comunicação com o servidor.';
        let errorTitle = 'Erro de Sistema';

        if (error.response) {
            // Erro retornado pelo Backend (4xx, 5xx)
            errorMessage = error.response.data.message || errorMessage;
            
            if (error.response.status === 403) errorTitle = 'Acesso Negado';
            if (error.response.status === 404) errorTitle = 'Não Localizado';
            if (error.response.status === 429) errorTitle = 'Limite Excedido';
        } else if (error.request) {
            // Servidor não respondeu
            errorMessage = 'O servidor backend não respondeu à solicitação. Verifique sua conexão ou status do serviço.';
        }

        // 3. EXIBIÇÃO DE ALERTA VISUAL (SWEETALERT2)
        // Só exibe o modal se a requisição não for marcada como 'silent' (ex: polling do dashboard)
        if (!originalRequest.silent) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: errorTitle,
                    text: errorMessage,
                    icon: 'error',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    confirmButtonColor: 'var(--primary-color)',
                    customClass: {
                        popup: 'oc-card rounded-md border-secondary'
                    }
                });
            } else {
                console.error(`[API Error: ${errorTitle}] ${errorMessage}`);
            }
        }

        return Promise.reject(error);
    }
);

/**
 * 🛠️ EXPOSIÇÃO DO WRAPPER GLOBAL
 * Encapsula os métodos HTTP com suporte a configurações enterprise.
 */
window.API = {
    /**
     * @param {string} url - Endpoint
     * @param {Object} config - Configurações Axios (ex: { params, silent: true })
     */
    get: (url, config = {}) => apiClient.get(url, config),
    
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    
    delete: (url, config = {}) => apiClient.delete(url, config),
    
    /**
     * Upload de arquivos reais para Supabase Storage
     */
    upload: (url, file, bucket, folder = '', onProgress) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('folder', folder);

        return apiClient.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            }
        });
    }
};

console.log('[API] Interface de integração V2 configurada.');