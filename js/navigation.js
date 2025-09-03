export const pageInitializers = {};
let currentPage = { id: null, params: null };

export function registerPageInitializer(pageId, initializer) {
    pageInitializers[pageId] = initializer;
}

export function getCurrentPage() {
    return currentPage;
}

export function navigateToPage(pageId, params = {}) {
    if (!pageId) return;

    // Esconde todas as páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });

    // Mostra a página de destino
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        currentPage = { id: pageId, params: params };

        // ALTERADO: Atualiza os links ativos no menu E o título do cabeçalho
        document.querySelectorAll('.menu-link').forEach(link => {
            const isActive = link.dataset.page === pageId;
            link.classList.toggle('active', isActive);

            // Se o link for o ativo, atualiza o título principal
            if (isActive) {
                const headerTitleElement = document.getElementById('header-title');
                if (headerTitleElement) {
                    // Clona o link para não modificar o original no DOM
                    const linkClone = link.cloneNode(true);
                    // Remove o ícone (<i>) para obter apenas o texto
                    const icon = linkClone.querySelector('i');
                    if (icon) {
                        icon.remove();
                    }
                    // Obtém o texto limpo do link e define como título
                    const pageTitle = linkClone.textContent.trim();
                    headerTitleElement.textContent = pageTitle;
                }
            }
        });

        // Executa a função de inicialização da página
        if (pageInitializers[pageId]) {
            try {
                pageInitializers[pageId](params);
            } catch (error) {
                console.error(`Erro ao inicializar a página '${pageId}':`, error);
            }
        }
    } else {
        console.warn(`Página com id '${pageId}' não encontrada.`);
        // Se uma página não for encontrada, volta para o início para evitar uma tela em branco
        navigateToPage('inicio');
    }
}


export function initializeNavigation() {
    // Ouve os cliques APENAS dentro do menu lateral para navegação interna
    document.getElementById('main-nav')?.addEventListener('click', (e) => {
        const link = e.target.closest('.menu-link');
        if (link) {
            e.preventDefault();
            const pageId = link.dataset.page;
            // Atualiza o URL e navega para a nova página
            if (window.location.hash !== `#${pageId}`) {
                history.pushState({ page: pageId }, '', `#${pageId}`);
            }
            navigateToPage(pageId);
        }
    });

    // Ouve os botões de voltar/avançar do navegador
    window.addEventListener('popstate', (event) => {
        // Apenas navega se houver um estado guardado no histórico.
        // Isto impede o erro de redirecionar para o início no carregamento inicial.
        if (event.state && event.state.page) {
            navigateToPage(event.state.page, event.state.params);
        }
    });
}


