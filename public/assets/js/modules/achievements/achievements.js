/**
 * OTAKU CLASH ANGOLA - ACHIEVEMENTS MODULE
 * Senior Frontend Engineer: Gamification & Rewards Management
 */

class AchievementsModule {
    constructor() {
        this.endpoint = '/achievements'; // Conforme backend real
        this.table = null;
        this.allAchievements = [];
        
        this.init();
    }

    async init() {
        console.log('[Achievements] Inicializando módulo...');
        this.setupEventListeners();
        await this.loadAchievements();
    }

    setupEventListeners() {
        // Botão de Novo Achievement
        const btnAdd = document.getElementById('btn-add-achievement');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => this.openFormModal());
        }

        // Formulário de Criação/Edição
        const form = document.getElementById('achievement-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSave(e));
        }

        // Filtro de Categoria
        const filterCategory = document.getElementById('filter-category');
        if (filterCategory) {
            filterCategory.addEventListener('change', () => this.applyFilters());
        }

        // Pesquisa
        const searchInput = document.getElementById('achievement-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
    }

    /**
     * Busca dados reais do backend
     */
    async loadAchievements() {
        this.showLoading(true);
        try {
            // Chamada ao backend real (via apiClient configurado em api.js)
            const response = await window.API.get(this.endpoint);
            
            if (response.status === 'success') {
                this.allAchievements = response.data;
                this.renderTable(this.allAchievements);
                this.updateStats();
            }
        } catch (error) {
            console.error('[Achievements] Erro ao carregar:', error);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Renderiza a tabela utilizando DataTables para performance enterprise
     */
    renderTable(data) {
        if (this.table) {
            this.table.destroy();
        }

        const tableBody = document.querySelector('#achievements-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = data.map(item => `
            <tr class="animate-up">
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${item.badge_url || '/assets/img/placeholders/badge.png'}" 
                             class="oc-avatar-sm rounded-sm me-3" alt="Badge">
                        <div>
                            <div class="fw-bold">${item.name}</div>
                            <small class="text-muted">${window.Formatters.truncate(item.description, 40)}</small>
                        </div>
                    </div>
                </td>
                <td><span class="oc-badge badge-info">${item.category}</span></td>
                <td>
                    <div class="text-dim small">${item.requirement_type}</div>
                    <div class="fw-bold">${item.requirement_value}</div>
                </td>
                <td>
                    <div class="text-success">+${item.reward_xp} XP</div>
                    <div class="text-primary">${window.Formatters.currency(item.reward_coins)}</div>
                </td>
                <td class="text-end">
                    <button class="btn-oc btn-oc-outline btn-sm me-2" onclick="Achievements.edit('${item.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-oc btn-oc-outline btn-sm text-danger" onclick="Achievements.delete('${item.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Inicializa DataTable se houver muitos registros
        if (data.length > 5) {
            this.table = $('#achievements-table').DataTable({
                pageLength: 10,
                searching: false,
                lengthChange: false,
                info: false,
                dom: 'tp',
                language: {
                    paginate: {
                        next: '<i class="bi bi-chevron-right"></i>',
                        previous: '<i class="bi bi-chevron-left"></i>'
                    }
                }
            });
        }
    }

    /**
     * Abre modal de criação/edição
     */
    openFormModal(data = null) {
        const modal = new bootstrap.Modal(document.getElementById('achievement-modal'));
        const form = document.getElementById('achievement-form');
        const title = document.getElementById('modal-title');

        form.reset();
        document.getElementById('achievement-id').value = data ? data.id : '';
        title.innerText = data ? 'Editar Conquista' : 'Nova Conquista';

        if (data) {
            // Preenche campos se for edição
            document.getElementById('name').value = data.name;
            document.getElementById('category').value = data.category;
            document.getElementById('requirement_type').value = data.requirement_type;
            document.getElementById('requirement_value').value = data.requirement_value;
            document.getElementById('reward_xp').value = data.reward_xp;
            document.getElementById('reward_coins').value = data.reward_coins;
            document.getElementById('description').value = data.description;
        }

        modal.show();
    }

    /**
     * Salva ou Atualiza via API
     */
    async handleSave(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const id = formData.get('id');
        const data = Object.fromEntries(formData.entries());

        try {
            let response;
            if (id) {
                response = await window.API.patch(`${this.endpoint}/${id}`, data);
            } else {
                response = await window.API.post(this.endpoint, data);
            }

            if (response.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('achievement-modal')).hide();
                window.showAlert('Sucesso', `Conquista ${id ? 'atualizada' : 'criada'} com sucesso!`, 'success');
                await this.loadAchievements();
            }
        } catch (error) {
            console.error('[Achievements] Erro ao salvar:', error);
        }
    }

    /**
     * Remove uma conquista (Soft delete no backend recomendado)
     */
    async delete(id) {
        const result = await Swal.fire({
            title: 'Tem certeza?',
            text: "Esta ação não pode ser desfeita!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            cancelButtonColor: 'var(--border-color)',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (result.isConfirmed) {
            try {
                const response = await window.API.delete(`${this.endpoint}/${id}`);
                if (response) {
                    window.showAlert('Excluído', 'A conquista foi removida do sistema.', 'success');
                    await this.loadAchievements();
                }
            } catch (error) {
                console.error('[Achievements] Erro ao excluir:', error);
            }
        }
    }

    /**
     * Edição (Busca dados e abre modal)
     */
    async edit(id) {
        try {
            const response = await window.API.get(`${this.endpoint}/${id}`);
            if (response.status === 'success') {
                this.openFormModal(response.data);
            }
        } catch (error) {
            console.error('[Achievements] Erro ao buscar detalhes:', error);
        }
    }

    /**
     * Filtros e Busca
     */
    applyFilters() {
        const category = document.getElementById('filter-category').value;
        const filtered = this.allAchievements.filter(item => {
            return category === '' || item.category === category;
        });
        this.renderTable(filtered);
    }

    handleSearch(query) {
        const q = query.toLowerCase();
        const filtered = this.allAchievements.filter(item => 
            item.name.toLowerCase().includes(q) || 
            item.description.toLowerCase().includes(q)
        );
        this.renderTable(filtered);
    }

    /**
     * Atualiza contadores no topo da página
     */
    updateStats() {
        const totalEl = document.getElementById('total-achievements');
        if (totalEl) totalEl.innerText = this.allAchievements.length;
        
        // Exemplo: Cálculo de XP total distribuído
        const totalXP = this.allAchievements.reduce((sum, item) => sum + (item.reward_xp || 0), 0);
        const xpEl = document.getElementById('total-reward-xp');
        if (xpEl) xpEl.innerText = window.Formatters.compactNumber(totalXP);
    }

    showLoading(show) {
        const loader = document.getElementById('table-loader');
        const content = document.getElementById('achievements-table');
        if (loader) loader.style.display = show ? 'block' : 'none';
        if (content) content.style.opacity = show ? '0.5' : '1';
    }
}

// Inicializa e expõe para eventos de onclick no HTML
window.Achievements = new AchievementsModule();