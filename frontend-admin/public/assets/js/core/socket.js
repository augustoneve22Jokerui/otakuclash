/**
 * ⚡ OTAKU CLASH ANGOLA - REAL-TIME SOCKET ENGINE
 * Versão: 2.0.0 - Enterprise Resilient
 * Senior Backend & DevOps Engineer: Real-time Orchestration
 */

class SocketManager {
    constructor() {
        this.socket = null;
        this.url = window.SOCKET_URL || 'https://otakuclashaangola.onrender.com';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Inicializa automaticamente se houver sessão ativa
        if (window.Auth && window.Auth.isAuthenticated()) {
            this.connect();
        }
    }

    /**
     * 🔌 ESTABELECE CONEXÃO COM O BACKEND
     * Configura o handshake com JWT e os listeners fundamentais.
     */
    connect() {
        const token = window.Auth.getAccessToken();

        if (!token) {
            console.warn('[Socket] Conexão abortada: Token não localizado.');
            return;
        }

        console.log('[Socket] Iniciando conexão em tempo real...');

        // Inicializa a instância do Socket.IO Client (Injetado via CDN no footer.ejs)
        this.socket = io(this.url, {
            auth: { token },
            transports: ['websocket', 'polling'], // Fallback automático para polling
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            autoConnect: true
        });

        this.setupGlobalListeners();
    }

    /**
     * 📡 CONFIGURA OUVINTES GLOBAIS DE SISTEMA
     */
    setupGlobalListeners() {
        if (!this.socket) return;

        // Sucesso na conexão
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log(`[Socket] Conectado com sucesso. ID: ${this.socket.id}`);
            
            // Remove banners de "Desconectado" se existirem na UI
            this.updateConnectivityUI(true);
        });

        // Falha na conexão (Handshake negado ou Timeout)
        this.socket.on('connect_error', (error) => {
            this.isConnected = false;
            console.error('[Socket] Erro de autenticação ou rede:', error.message);
            
            if (error.message.includes('Acesso negado')) {
                console.warn('[Socket] Token inválido. Forçando logout...');
                window.Auth.logout();
            }
            this.updateConnectivityUI(false);
        });

        // Desconexão inesperada
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.warn(`[Socket] Conexão perdida. Motivo: ${reason}`);
            this.updateConnectivityUI(false);
            
            if (reason === "io server disconnect") {
                // Reconexão manual se o servidor forçar o drop
                this.socket.connect();
            }
        });

        /**
         * 🔔 LISTENER DE NOTIFICAÇÕES (BROADCAST/PRIVATE)
         * Atualiza o contador na Navbar e exibe o Toast.
         */
        this.socket.on('notification:received', (data) => {
            console.log('[Socket] Nova notificação recebida:', data);
            this.handleIncomingNotification(data);
        });

        /**
         * 👤 LISTENER DE PRESENÇA
         * Permite que o dashboard saiba quem entrou/saiu do sistema global.
         */
        this.socket.on('presence:online', (data) => {
            // Dispara evento interno para o Dashboard.js
            document.dispatchEvent(new CustomEvent('presence_update', { 
                detail: { ...data, type: 'online' } 
            }));
        });

        this.socket.on('presence:offline', (data) => {
            document.dispatchEvent(new CustomEvent('presence_update', { 
                detail: { ...data, type: 'offline' } 
            }));
        });

        // Mensagens de Erro de Sistema
        this.socket.on('system:error', (error) => {
            if (window.showAlert) {
                window.showAlert('Erro de Transmissão', error.message, 'error');
            }
        });
    }

    /**
     * 💅 ATUALIZA INTERFACE DE NOTIFICAÇÕES
     */
    handleIncomingNotification(data) {
        // 1. Atualiza o contador visual na Navbar
        const badge = document.getElementById('navbar-notification-count');
        if (badge) {
            let current = parseInt(badge.innerText) || 0;
            badge.innerText = current + 1;
            badge.style.display = 'flex';
            badge.classList.add('animate-scale');
        }

        // 2. Exibe o Alerta Visual (Toast) via SweetAlert2
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });

            Toast.fire({
                icon: data.type === 'WALLET_UPDATE' ? 'success' : 'info',
                title: data.title,
                text: data.message
            });
        }
    }

    /**
     * 🌐 HELPER DE STATUS DE CONEXÃO
     */
    updateConnectivityUI(isOnline) {
        const indicator = document.getElementById('server-status-badge');
        if (indicator) {
            indicator.className = `oc-badge ${isOnline ? 'badge-success' : 'badge-danger'}`;
            indicator.innerText = isOnline ? 'ONLINE' : 'DESCONECTADO';
        }
    }

    /**
     * 📤 WRAPPERS DE COMUNICAÇÃO
     */
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.error(`[Socket] Impossível emitir ${event}: Offline.`);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    /**
     * 🚪 FINALIZA CONEXÃO
     */
    disconnect() {
        if (this.socket) {
            console.log('[Socket] Encerrando conexão por solicitação do utilizador.');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// Inicializa o Singleton e expõe globalmente
window.Socket = new SocketManager();