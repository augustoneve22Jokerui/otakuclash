/**
 * OTAKU CLASH ANGOLA - BATTLE ROYALE MANAGEMENT MODULE
 * Senior Frontend Engineer: Real-time Gameplay Operations
 */

class BattleRoyaleModule {
    constructor() {
        this.endpoint = '/battle-royale/rooms';
        this.activeRooms = [];
        this.currentRoomId = null;
        
        this.init();
    }

    init() {
        console.log('[BattleRoyale] Inicializando módulo de gestão...');
        this.setupEventListeners();
        this.setupSocketListeners();
        this.loadRooms();
    }

    setupEventListeners() {
        // Botão para abrir modal de criação
        const btnCreate = document.getElementById('btn-create-br');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('br-modal'));
                modal.show();
            });
        }

        // Formulário de Criação de Sala
        const form = document.getElementById('br-create-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleCreateRoom(e));
        }

        // Refresh manual
        const btnRefresh = document.getElementById('btn-refresh-br');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.loadRooms());
        }
    }

    /**
     * Listeners de Socket.IO para atualizações em tempo real
     * Baseado nos eventos emitidos pelo BattleRoyaleController do backend
     */
    setupSocketListeners() {
        // Quando uma nova sala é criada globalmente
        window.Socket.on('br:room_created', (data) => {
            console.log('[BR-Socket] Nova sala detectada:', data);
            this.loadRooms();
        });

        // Atualização de jogadores em uma sala específica
        window.Socket.on('br:player_list_updated', (data) => {
            if (this.currentRoomId === data.roomId) {
                this.updatePlayersUI(data.players, data.total);
            }
        });

        // Feed de eliminação em tempo real
        window.Socket.on('br:feed_update', (data) => {
            this.pushToFeed(data.message);
        });

        // Fim de jogo
        window.Socket.on('br:game_over', (data) => {
            this.handleGameOver(data);
        });
    }

    /**
     * Carrega as salas existentes via API
     */
    async loadRooms() {
        this.toggleLoading(true);
        try {
            const response = await window.API.get(this.endpoint);
            if (response.status === 'success') {
                this.activeRooms = response.data;
                this.renderRoomsGrid(this.activeRooms);
            }
        } catch (error) {
            console.error('[BattleRoyale] Erro ao carregar salas:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza o grid de salas ativas
     */
    renderRoomsGrid(rooms) {
        const container = document.getElementById('br-rooms-grid');
        if (!container) return;

        if (rooms.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-sword text-dim display-1 mb-3"></i>
                    <p class="text-muted">Nenhuma arena de Battle Royale ativa no momento.</p>
                </div>`;
            return;
        }

        container.innerHTML = rooms.map(room => {
            const statusBadge = room.status === 'WAITING' ? 'badge-success' : 'badge-warning';
            return `
                <div class="col-md-4 mb-4">
                    <div class="oc-card hover-lift animate-up">
                        <div class="oc-card-header">
                            <span class="oc-badge ${statusBadge}">${room.status}</span>
                            <small class="text-dim">#${room.roomCode}</small>
                        </div>
                        <h5 class="mt-2 mb-1">${room.title}</h5>
                        <p class="text-muted small mb-3">Anime: ${room.anime.title}</p>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="text-dim">
                                <i class="bi bi-people me-1"></i> ${room.settings.currentPlayers}/${room.settings.maxPlayers}
                            </div>
                            <div class="text-primary fw-bold">
                                ${window.Formatters.currency(room.settings.entryFee)}
                            </div>
                        </div>

                        <button class="btn-oc btn-oc-primary w-100" onclick="BRManage.monitorRoom('${room.id}')">
                            <i class="bi bi-speedometer2 me-2"></i> Monitorar Arena
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Cria uma nova sala via Socket ou API (Administrativo)
     */
    async handleCreateRoom(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        this.toggleBtnLoading('btn-submit-br', true);

        try {
            // Utilizamos o socket para criação administrativa para que todos os admins vejam instantaneamente
            window.Socket.emit('br:create_room', {
                title: data.title,
                animeId: parseInt(data.anime_id),
                maxPlayers: parseInt(data.max_players),
                entryFee: parseFloat(data.entry_fee)
            });

            // O socket_listener 'br:room_created' cuidará do refresh e fechará o modal
            bootstrap.Modal.getInstance(document.getElementById('br-modal')).hide();
            e.target.reset();
            window.showAlert('Sucesso', 'A arena está sendo preparada!', 'success');

        } catch (error) {
            console.error('[BattleRoyale] Erro ao criar:', error);
        } finally {
            this.toggleBtnLoading('btn-submit-br', false);
        }
    }

    /**
     * Entra no modo de monitoramento de uma sala específica
     */
    monitorRoom(roomId) {
        this.currentRoomId = roomId;
        const room = this.activeRooms.find(r => r.id === roomId);
        
        // Exibe painel de monitoramento (Geralmente um modal ou troca de view)
        document.getElementById('monitor-title').innerText = room.title;
        document.getElementById('monitor-players-count').innerText = `${room.settings.currentPlayers}/${room.settings.maxPlayers}`;
        
        const monitorModal = new bootstrap.Modal(document.getElementById('br-monitor-modal'));
        monitorModal.show();

        // Limpa o feed anterior
        document.getElementById('br-feed').innerHTML = '';
        this.pushToFeed(`Iniciando monitoramento da sala ${room.roomCode}...`);
    }

    /**
     * Atualiza a lista de jogadores no monitor
     */
    updatePlayersUI(players, total) {
        const list = document.getElementById('monitor-players-list');
        const count = document.getElementById('monitor-players-count');
        if (count) count.innerText = `${players.length}/${total}`;
        if (!list) return;

        list.innerHTML = players.map(p => `
            <div class="d-flex align-items-center mb-2 p-2 rounded-sm ${p.eliminated ? 'bg-danger-soft opacity-50' : 'bg-dark'}">
                <img src="${p.avatarUrl || '/assets/img/placeholders/avatar.png'}" class="oc-avatar-sm rounded-circle me-2">
                <div class="flex-grow-1">
                    <div class="small fw-bold">${p.username}</div>
                    <div style="font-size: 10px;" class="text-muted">Nível ${p.level}</div>
                </div>
                ${p.eliminated ? '<span class="badge bg-danger">ELIMINADO</span>' : '<span class="status-pulse-green"></span>'}
            </div>
        `).join('');
    }

    /**
     * Adiciona mensagem ao feed de eventos da partida
     */
    pushToFeed
    }