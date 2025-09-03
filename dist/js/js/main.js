// js/main.js - VERSÃO COMPLETA E CORRIGIDA

// 1. Importa as funções de inicialização dos módulos base
import { initializeTheme, initializeSideMenu, initializePasswordToggles } from './ui.js';
import { initializeAuth } from './auth.js';
import { navigateToPage, initializeNavigation, registerPageInitializer, getCurrentPage, pageInitializers } from './navigation.js';

// 2. Importa TODOS os inicializadores de cada página da pasta /pages
import { initializeDashboardPage } from './pages/dashboard.js'; 
import { initializeEstudosPage, updateEstudosUIVisibility } from './pages/estudos.js'; 
import { initializeEventosPage, updateEventosUIVisibility } from './pages/events.js'; 
import { initializeHomePage } from './pages/home.js'; 
import { initializeBiblePage } from './pages/bible.js';
import { initializeGcCadastroPage, initializeGcEnderecosPage } from './pages/gcs.js';
import { initializePastoresPage, updatePastoresUIVisibility } from './pages/pastores.js';
import { initializeGcLideresPage } from './pages/lideres.js';
import { initializeQrCodePage } from './pages/qrcode.js';
import { initializeMeuGcPage, initializeNovosCadastrosPage } from './pages/leader.js'; 
import { 
    initializeGerirContasPage, 
    initializeGerirLideresPage, 
    initializeRelatorioGeralPage,
    initializeAdminListeners
} from './pages/admin.js';
import { initializeGerirFormulariosPage, initializeDynamicFormPage } from './pages/forms.js';
import { initializeVideosPage } from './pages/videos.js';


// 3. Ouve o evento DOMContentLoaded para garantir que o HTML foi totalmente carregado
document.addEventListener('DOMContentLoaded', () => {
    
    // Garante que este código só corre na página admin.html
    if (document.getElementById('main-app-container')) {
        console.log("A inicializar o painel de administração...");

        // Inicializa componentes de UI globais
        initializeTheme();
        initializeSideMenu();
        initializePasswordToggles();

        // Inicializa a autenticação
        initializeAuth((userRole) => {
            console.log(`Auth state changed. User role is now: ${userRole}`);

            // ADICIONADO: Redireciona para a página inicial se o utilizador fizer logout
            if (!userRole) {
                window.location.href = 'index.html';
                return; // Impede a execução do resto do código para um utilizador deslogado
            }
            
            updateEstudosUIVisibility(userRole);
            updateEventosUIVisibility(userRole);
            updatePastoresUIVisibility(userRole); // ▲▲▲ LINHA ADICIONADA ▲▲▲
            
            const currentPageData = getCurrentPage();
            if (currentPageData.id && pageInitializers[currentPageData.id]) {
                pageInitializers[currentPageData.id](currentPageData.params);
            }
        });

        // Regista TODAS as páginas no sistema de navegação
        registerPageInitializer('inicio', initializeDashboardPage);
        registerPageInitializer('editar-inicio', initializeHomePage);
        registerPageInitializer('pastores', initializePastoresPage);
        registerPageInitializer('biblia', initializeBiblePage);
        registerPageInitializer('estudos', initializeEstudosPage);
        registerPageInitializer('eventos', initializeEventosPage);
        registerPageInitializer('videos', initializeVideosPage);
        registerPageInitializer('gcs-cadastro', initializeGcCadastroPage);
        registerPageInitializer('gcs-lideres', initializeGcLideresPage);
        registerPageInitializer('gcs-enderecos', initializeGcEnderecosPage);
        registerPageInitializer('qrcode', initializeQrCodePage);
        registerPageInitializer('lider-meu-gc', initializeMeuGcPage);
        registerPageInitializer('lider-novos-cadastros', initializeNovosCadastrosPage);
        registerPageInitializer('admin-gerir-contas', initializeGerirContasPage);
        registerPageInitializer('admin-gerir-lideres', initializeGerirLideresPage);
        registerPageInitializer('admin-relatorio-geral', initializeRelatorioGeralPage);
        registerPageInitializer('admin-gerir-formularios', initializeGerirFormulariosPage);
        registerPageInitializer('dynamic-form-page', initializeDynamicFormPage);

        // Inicializa os listeners que só precisam de ser configurados uma vez para a área de admin
        initializeAdminListeners();
        
        // Inicializa o sistema de navegação
        initializeNavigation();

        // --- LÓGICA DE CARREGAMENTO INICIAL E ROTEAMENTO ---
        const urlParams = new URLSearchParams(window.location.search);
        
        const [hash, paramsString] = window.location.hash.substring(1).split('?');
        const hashParams = new URLSearchParams(paramsString);

        if (urlParams.has('formId')) {
            document.querySelector('header').classList.add('hidden');
            document.getElementById('side-menu').classList.add('hidden');
            navigateToPage('dynamic-form-page'); 
        } else if (hash && document.getElementById(hash)) {
            const pageParams = {};
            if (hash === 'estudos' && hashParams.has('view')) {
                pageParams.viewStudyId = hashParams.get('view');
            }
            navigateToPage(hash, pageParams);
        } else {
            navigateToPage('inicio');
            history.replaceState({ page: 'inicio', params: null }, '', '#inicio');
        }
    } else {
        console.log("A carregar a página pública. O main.js não fará nada aqui.");
    }
});


