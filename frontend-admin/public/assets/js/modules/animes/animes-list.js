/**
 * OTAKU CLASH ANGOLA - ANIMES LIST MODULE
 * Senior Frontend Engineer: Catalog & API Integration
 */

class AnimesListModule {
    constructor() {
        this.endpoint = '/animes';
        this.table = null;
        this.currentPage = 1;
        this.limit = 10;
        
        this.init();
    }

    async init() {
        console.log('[Animes] Inicializando listagem...');
        this.setupEventListeners();
        await this.loadGenres();
        await this.loadAnimes();
    }

    setupEventListeners() {
        // Busca com Debounce
        const searchInput = document.getElementById('anime-search');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadAnimes(e.target.value);
                }, 500);
            });
        }

        // Filtros
        ['filter-genre', 'filter-type', 'filter-order'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadAnimes();
            });
        });

        // Botão Sincronizar Manual (MAL ID)
        const btnSync = document.getElementById('btn-sync-mal');
        if (btnSync) {
            btnSync.addEventListener('click', () => this.promptSync());
        }
    }

    /**
     * Carrega gêneros reais do backend para preencher o filtro
     */
    async loadGenres() {
        try {
            const response = await window.API.get(`${this.endpoint}/genres`);
            const select = document.getElementById('filter-genre');
            if (select && response.data) {
                response.data.forEach(genre => {
                    const option = document.createElement('option');
                    option.value = genre;
                    option.textContent = genre;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('[Animes] Erro ao carregar gêneros:', error);
        }
    }

    /**
     * Carrega a lista de animes com filtros e paginação
     */
    async loadAnimes(search = '') {
        this.toggleLoading(true);
        
        const genre = document.getElementById('filter-genre')?.value;
        const type = document.getElementById('filter-type')?.value;
        const order = document.getElementById('filter-order')?.value || 'score';

        const params = {
            page: this.currentPage,
            limit: this.limit,
            search: search || document.getElementById('anime-search')?.value,
            genre: genre || undefined,
            type: type || undefined,
            orderBy: order,
            order: 'DESC'
        };

        try {
            const response = await window.API.get(this.endpoint, { params });
            
            if (response.status === 'success') {
                this.renderTable(response.data);
                this.renderPagination(response.pagination);
                this.updateCounters(response.pagination.total);
            }
        } catch (error) {
            console.error('[Animes] Erro ao carregar lista:', error);
        } finally {
            this.toggleLoading(false);
        }
    }

    /**
     * Renderiza o corpo da tabela de animes
     */
    renderTable(animes) {
        const container = document.querySelector('#animes-table tbody');
        if (!container) return;

        if (animes.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="text-center py-5">Nenhum anime encontrado.</td></tr>`;
            return;
        }

        container.innerHTML = animes.map(anime => `
            <tr class="animate-up">
                <td style="width: 80px;">
                    <img src="${anime.imageUrl}" class="rounded-sm" 
                         style="width: 50px; height: 70px; object-fit: cover; border: 1px solid var(--border-color);" 
                         alt="Cover">
                </td>
                <td>
                    <div class="fw-bold text-main">${anime.title}</div>
                    <div class="small text-muted">${anime.titleEnglish || ''}</div>
                    <div class="mt-1">
                        ${anime.genres.slice(0, 3).map(g => `<span class="badge bg-dark text-dim border border-secondary me-1" style="font-size: 10px;">${g}</span>`).join('')}
                    </div>
                </td>
                <td>
                    <div class="badge badge-info">${anime.type}</div>
                    <div class="small text-muted mt-1">${anime.episodes || '?'} episódios</div>
                </td>
                <td>
                    <div class="d-flex align-items-center text-warning">
                        <i class="bi bi-star-fill me-1"></i>
                        <span class="fw-bold">${anime.score || 'N/A'}</span>
                    </div>
                    <div class="small text-muted">${anime.year || anime.status}</div>
                </td>
                <td>
                    <div class="small text-muted">Sincronizado em</div>
                    <div>${window.Formatters.date(anime.updatedAt, true)}</div>
                </td>
                <td class="text-end">
                    <div class="dropdown">
                        <button class="btn-oc btn-oc-outline btn-sm" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="/animes/edit/${anime.id}"><i class="bi bi-pencil me-2"></i> Editar</a></li>
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="AnimesList.syncSingle(${anime.malId})"><i class="bi bi-arrow-repeat me-2"></i> Forçar Resync</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="AnimesList.delete('${anime.id}')"><i class="bi bi-trash me-2"></i> Remover</a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Componente de Paginação Dinâmica
     */
    renderPagination(meta) {
        const container = document.getElementById('pagination-container');
        if (!container) return;

        let html = `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === 1 ? 'disabled' : ''} onclick="AnimesList.changePage(${meta.page - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
        `;

        for (let i = 1; i <= meta.totalPages; i++) {
            if (i === 1 || i === meta.totalPages || (i >= meta.page - 1 && i <= meta.page + 1)) {
                html += `
                    <button class="btn-oc ${meta.page === i ? 'btn-oc-primary' : 'btn-oc-outline'} btn-sm" onclick="AnimesList.changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === meta.page - 2 || i === meta.page + 2) {
                html += `<span class="text-muted">...</span>`;
            }
        }

        html += `
            <button class="btn-oc btn-oc-outline btn-sm" ${meta.page === meta.totalPages ? 'disabled' : ''} onclick="AnimesList.changePage(${meta.page + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;

        container.innerHTML = html;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadAnimes();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Dispara o modal de sincronização manual via MAL ID (Integração direta com Backend Sync Service)
     */
    async promptSync() {
        const { value: malId } = await Swal.fire({
            title: 'Sincronizar via MyAnimeList',
            input: 'number',
            inputLabel: 'Digite o MAL ID do Anime',
            inputPlaceholder: 'Ex: 20 (Naruto)',
            showCancelButton: true,
            confirmButtonText: 'Sincronizar Agora',
            confirmButtonColor: 'var(--primary-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            inputAttributes: {
                min: 1,
                step: 1
            }
        });

        if (malId) {
            this.syncSingle(malId);
        }
    }

    async syncSingle(malId) {
        Swal.fire({
            title: 'Sincronizando...',
            text: 'Aguarde enquanto buscamos os dados e personagens.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // POST /api/v1/animes/sync/:malId
            const response = await window.API.post(`${this.endpoint}/sync/${malId}`);
            
            if (response.status === 'success') {
                Swal.fire('Sucesso!', 'Anime sincronizado com sucesso.', 'success');
                this.loadAnimes();
            }
        } catch (error) {
            console.error('[Animes] Erro de sincronização:', error);
        }
    }

    async delete(id) {
        const confirm = await Swal.fire({
            title: 'Excluir Anime?',
            text: "Isso removerá o anime e suas questões vinculadas!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-color)',
            confirmButtonText: 'Sim, excluir'
        });

        if (confirm.isConfirmed) {
            try {
                await window.API.delete(`${this.endpoint}/${id}`);
                window.showAlert('Removido', 'Anime excluído do catálogo.', 'success');
                this.loadAnimes();
            } catch (error) {
                console.error('[Animes] Erro ao excluir:', error);
            }
        }
    }

    updateCounters(total) {
        const el = document.getElementById('total-animes-count');
        if (el) el.innerText = total;
    }

    toggleLoading(show) {
        const loader = document.getElementById('anime-table-loader');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    }
}

// Inicializa o módulo
window.AnimesList = new AnimesListModule();