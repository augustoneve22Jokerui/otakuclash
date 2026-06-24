/**
 * 🚀 OTAKU CLASH ANGOLA - FRONTEND ADMIN SERVER
 * Versão: 2.0.0 - Enterprise Resilient
 * Descrição: Servidor Express para entrega de templates EJS e gestão de segurança.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Engine de Visualização (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * 🔒 CONFIGURAÇÃO DE SEGURANÇA (HELMET & CSP)
 * Ajustado para permitir comunicação total com o Backend Render e Supabase.
 */
const backendUrl = process.env.API_URL || 'https://otakuclashaangola.onrender.com/api/v1';
const socketUrl = process.env.SOCKET_URL || 'https://otakuclashaangola.onrender.com';
const supabaseUrl = 'https://mdlwexnkufusqfifflsd.supabase.co';

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'", 
                "https://cdn.jsdelivr.net", 
                "https://kit.fontawesome.com", 
                "https://unpkg.com", 
                "https://cdnjs.cloudflare.com",
                "https://cdn.socket.io",
                "https://code.jquery.com",
                "https://cdn.datatables.net"
            ],
            "style-src": [
                "'self'", 
                "'unsafe-inline'", 
                "https://cdn.jsdelivr.net", 
                "https://fonts.googleapis.com", 
                "https://cdnjs.cloudflare.com",
                "https://use.fontawesome.com",
                "https://cdn.datatables.net",
                "https://unpkg.com"
            ],
            "font-src": [
                "'self'", 
                "data:",
                "https://fonts.gstatic.com", 
                "https://use.fontawesome.com", 
                "https://cdn.jsdelivr.net", 
                "https://cdnjs.cloudflare.com"
            ],
            "img-src": [
                "'self'", 
                "data:", 
                "https://*", // Permite capas de animes de qualquer CDN (MAL, AniList, etc)
                supabaseUrl
            ],
            "connect-src": [
                "'self'", 
                backendUrl, 
                socketUrl,
                socketUrl.replace('https://', 'wss://'), // Permite WebSocket Secure
                socketUrl.replace('http://', 'ws://'),   // Permite WebSocket (Local)
                supabaseUrl,
                "https://cdn.jsdelivr.net"
            ],
            "object-src": ["'none'"],
            "upgrade-insecure-requests": [],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));

/**
 * ⚡ PERFORMANCE E INFRAESTRUTURA
 */
app.use(morgan('dev'));
app.use(compression());
app.use(cookieParser(process.env.SESSION_SECRET || 'otaku_clash_admin_secret_2026'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Servir Arquivos Estáticos com Cache Control
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

/**
 * 🌍 VARIÁVEIS GLOBAIS PARA TEMPLATES (LOCAL VARIABLES)
 * Garante que todos os arquivos EJS e JS do client tenham as URLs corretas.
 */
app.use((req, res, next) => {
    res.locals.apiUrl = backendUrl;
    res.locals.socketUrl = socketUrl;
    res.locals.appName = process.env.APP_NAME || "Otaku Clash Angola - Admin";
    res.locals.version = "2.0.0-STABLE";
    next();
});

/**
 * 🛣️ ROTEAMENTO DE PÁGINAS (ADMIN V2)
 */
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.render('pages/auth/login', { title: 'Acesso Restrito', active: 'login' }));
app.get('/dashboard', (req, res) => res.render('pages/dashboard/index', { title: 'Painel Geral', active: 'dashboard' }));

// Módulo de Usuários
app.get('/users', (req, res) => res.render('pages/users/list', { title: 'Gestão de Usuários', active: 'users' }));
app.get('/users/new', (req, res) => res.render('pages/users/form', { title: 'Nova Conta', active: 'users' }));
app.get('/users/:id', (req, res) => res.render('pages/users/details', { title: 'Perfil do Usuário', active: 'users', userId: req.params.id }));
app.get('/users/edit/:id', (req, res) => res.render('pages/users/form', { title: 'Editar Conta', active: 'users', userId: req.params.id }));

// Módulo de Catálogo
app.get('/animes', (req, res) => res.render('pages/animes/list', { title: 'Catálogo de Animes', active: 'animes' }));
app.get('/animes/new', (req, res) => res.render('pages/animes/form', { title: 'Novo Anime', active: 'animes' }));
app.get('/animes/edit/:id', (req, res) => res.render('pages/animes/form', { title: 'Editar Obra', active: 'animes', animeId: req.params.id }));
app.get('/characters', (req, res) => res.render('pages/characters/list', { title: 'Base de Personagens', active: 'characters' }));
app.get('/questions', (req, res) => res.render('pages/questions/list', { title: 'Banco de Questões', active: 'questions' }));
app.get('/questions/new', (req, res) => res.render('pages/questions/form', { title: 'Nova Questão', active: 'questions' }));
app.get('/questions/edit/:id', (req, res) => res.render('pages/questions/form', { title: 'Editar Questão', active: 'questions', questionId: req.params.id }));

// Módulo de Arena
app.get('/quiz', (req, res) => res.render('pages/quiz/manage', { title: 'Configurações de Quiz', active: 'quiz' }));
app.get('/matches', (req, res) => res.render('pages/matches/index', { title: 'Monitor de Arena', active: 'matches' }));
app.get('/battle-royale', (req, res) => res.render('pages/battleroyale/manage', { title: 'Gestão Battle Royale', active: 'battleroyale' }));
app.get('/tournaments', (req, res) => res.render('pages/tournaments/manage', { title: 'Torneios Oficiais', active: 'tournaments' }));

// Módulo Financeiro
app.get('/wallets', (req, res) => res.render('pages/wallets/index', { title: 'Carteiras Digitais', active: 'wallets' }));
app.get('/transactions', (req, res) => res.render('pages/transactions/index', { title: 'Ledger Financeiro', active: 'transactions' }));
app.get('/payments', (req, res) => res.render('pages/payments/index', { title: 'Gateways de Pagamento', active: 'payments' }));

// Módulo Social e Sistema
app.get('/rankings', (req, res) => res.render('pages/rankings/index', { title: 'Tiers Competitivos', active: 'rankings' }));
app.get('/notifications', (req, res) => res.render('pages/notifications/index', { title: 'Central de Alertas', active: 'notifications' }));
app.get('/achievements', (req, res) => res.render('pages/achievements/index', { title: 'Sistema de Gamificação', active: 'achievements' }));
app.get('/guilds', (req, res) => res.render('pages/guilds/index', { title: 'Clãs e Guildas', active: 'guilds' }));
app.get('/reports', (req, res) => res.render('pages/reports/index', { title: 'Moderação de Denúncias', active: 'reports' }));
app.get('/audit-logs', (req, res) => res.render('pages/audit-logs/index', { title: 'Logs de Auditoria', active: 'audit-logs' }));
app.get('/settings', (req, res) => res.render('pages/settings/index', { title: 'Configurações Globais', active: 'settings' }));
app.get('/health-monitor', (req, res) => res.render('pages/health-monitor/index', { title: 'Status da Infraestrutura', active: 'health' }));

/**
 * 🚨 TRATAMENTO DE ERROS DE ROTA
 */
app.use((req, res) => {
    res.status(404).render('pages/errors/404', { title: '404 - Página Não Encontrada' });
});

app.use((err, req, res, next) => {
    console.error('[Fatal Error: Frontend Server]', err.stack);
    res.status(500).render('pages/errors/500', { 
        title: '500 - Erro de Sistema', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno ao processar a interface.' 
    });
});

/**
 * 🟢 BOOTSTRAP
 */
app.listen(PORT, () => {
    console.log(`
    ========================================================
    🛡️  OTAKU CLASH ANGOLA - ADMIN DASHBOARD OPERACIONAL
    🌐 AMBIENTE: ${process.env.NODE_ENV}
    🔌 PORTA: ${PORT}
    🔗 BACKEND URL: ${backendUrl}
    ⚙️  CSP: CONFIGURADO PARA WEBSOCKETS (WSS)
    ========================================================
    `);
});

module.exports = app;