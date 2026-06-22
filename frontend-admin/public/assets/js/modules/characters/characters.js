/**
 * OTAKU CLASH ANGOLA - CHARACTERS MANAGEMENT MODULE
 * Senior Frontend Engineer: Character Database & Asset Management
 */

class CharactersModule {
    constructor() {
        this.endpoint = '/characters';
        this.animesEndpoint = '/animes';
        this.table = null;
        this.currentPage = 1;
        this.limit = 10;
        this.allAnimes = []; // Para popular o select de vínculo

        this.init();
    }

    async init() {
        console.log('[Characters] Inicializando módulo de personagens...');
        this.setupEventListeners();
        await this.loadAnimesList(); // Carrega animes para o formulário
        await this.loadCharacters();
    }

    setupEventListeners() {
        // Botão Novo Personagem
        const btnAdd = document.getElementById('btn-add-character');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => this.openFormModal());
        }

        // Formulário de Cadastro/Edição
        const form = document.getElementById('character-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSave(e));
        }

        // Busca com Debounce
        const searchInput = document.getElementById('character-search');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadCharacters(e.target.value);
                }, 500);
            });
        }

        // Preview de imagem no formulário
        const imgInput = document.getElementById('imageUrl');
        if (imgInput) {
            imgInput.addEventListener('input', (e) => this.updateImagePreview(e.target.value));
        }
    }

    /**
     * Carrega lista simplificada de animes para o select do formulário
     */
    async loadAnimesList() {
        try {
            const response = await window.API.get(this.animesEndpoint, { params: { limit: 1000 } });
            if (response.status === 'success') {
                this.allAnimes = response.data;
                this.populateAnimeSelect();
            }
        } catch (error) {
            console.error('[Characters] Erro ao carregar lista de animes:', error);
        }
    }

    populateAnimeSelect() {
        const select = document.getElementById('anime_id');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione o Anime...</option>';
        this.allAnimes.forEach(anime => {
            const option = document.createElement('option');
            option.value = anime.id;
            option.textContent = anime.title;
            select.appendChild(option);
        });
    }

    /**
     * Busca personagens do backend real
     */
    async loadCharacters(search = '') {
        this.toggleLoading(true);
        const params = {
            page: this.currentPage,
            limit: this.limit,
            search: search || document.getElementById('character-search')?.value
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            if (response.status === 'success') {
                this.renderTable(response.data);
                this.renderPagination(response.pagination);
            }
        } catch (error) {
            console.error('[Characters] Erro ao carregar personagens:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza a tabela de personagens
     */
    renderTable(characters) {
        const container = document.querySelector('#characters-table tbody');
        if (!container) return;

        if (characters.length === 0) {
            container.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">Nenhum personagem encontrado.</td></tr>`;
            return;
        }

        container.innerHTML = characters.map(char => `
            <tr class="animate-up">
                <td style="width: 60px;">
                    <img src="${char.imageUrl || '/assets/img/placeholders/character.png'}" 
                         class="rounded-circle oc-avatar" alt="Avatar">
                </td>
                <td>
                    <div class="fw-bold text-main">${char.name}</div>
                    <div class="small text-muted">MAL ID: ${char.malId || 'N/A'}</div>
                </td>
                <td>
                    <span class="text-secondary fw-500">${char.animeTitle || 'Não vinculado'}</span>
                </td>
                <td>
                    <span class="oc-badge ${char.role === 'Main' ? 'badge-info' : 'badge-soft-primary'}">
                        ${char.role || 'Supporting'}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn-oc btn-oc-outline btn-sm me-1" onclick="Characters.edit('${char.id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-oc btn-oc-outline btn-sm text-danger" onclick="Characters.delete('${char.id}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Lógica de Paginação
     */
    renderPagination(meta) {
        const container = document.getElementById('characters-pagination');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="Characters.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
            <span class="px-3 text-muted small">Página ${meta.page} de ${meta.totalPages}</span>
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="Characters.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadCharacters();
    }

    /**
     * Formulário: Criação e Edição
     */
    openFormModal(data = null) {
        const modal = new bootstrap.Modal(document.getElementById('character-modal'));
        const form = document.getElementById('character-form');
        const title = document.getElementById('modal-title');
        
        form.reset();
        document.getElementById('char-id').value = data ? data.id : '';
        title.innerText = data ? 'Editar Personagem' : 'Novo Personagem';

        if (data) {
            document.getElementById('name').value = data.name;
            document.getElementById('anime_id').value = data.animeId;
            document.getElementById('role').value = data.role;
            document.getElementById('imageUrl').value = data.imageUrl;
            document.getElementById('about').value = data.about;
            this.updateImagePreview(data.imageUrl);
        } else {
            this.updateImagePreview('');
        }

        modal.show();
    }

    async handleSave(e) {
        e.preventDefault();
        if (!window.Validators.validateForm('character-form')) return;

        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        const id = payload.id;
        delete payload.id;

        this.toggleBtnLoading('btn-save-character', true);

        try {
            let response;
            if (id) {
                response = await window.API.patch(`${this.endpoint}/${id}`, payload);
            } else {
                response = await window.API.post(this.endpoint, payload);
            }

            if (response.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('character-modal')).hide();
                window.showAlert('Sucesso', `Personagem ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
                this.loadCharacters();
            }
        } catch (error) {
            console.error('[Characters] Erro ao salvar:', error);
        } finally {
            this.toggleBtnLoading('btn-save-character', false);
        }
    }

    async edit(id) {
        try {
            const response = await window.API.get(`${this.endpoint}/${id}`);
            if (response.status === 'success') {
                this.openFormModal(response.data);
            }
        } catch (error) {
            console.error('[Characters] Erro ao buscar detalhes:', error);
        }
    }

    async delete(id) {
        const result = await Swal.fire({
            title: 'Excluir Personagem?',
            text: "Esta ação afetará questões de quiz vinculadas!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            confirmButtonText: 'Sim, remover',
            background: 'var(--bg-card)',
            color: 'var(--text-main)'
        });

        if (result.isConfirmed) {
            try {
                await window.API.delete(`${this.endpoint}/${id}`);
                window.showAlert('Removido', 'Personagem excluído com sucesso.', 'success');
                this.loadCharacters();
            } catch (error) {
                console.error('[Characters] Erro ao excluir:', error);
            }
        }
    }

    /**
     * Helpers de UI
     */
    updateImagePreview(url) {
        const preview = document.getElementById('char-preview');
        if (preview) {
            preview.src = url || '/assets/img/placeholders/character.png';
        }
    }

    toggleLoading(show) {
        const loader = document.getElementById('char-loader');
        const table = document.getElementById('characters-table');
        if (loader) loader.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.4' : '1';
    }

    toggleBtnLoading(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm me-2"></span> Processando...` : `<i class="bi bi-check-lg me-2"></i> Salvar Personagem`;
    }
}

// Inicialização
window.Characters = new CharactersModule();