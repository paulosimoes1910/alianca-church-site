// js/ui.js
// Este ficheiro gere os elementos de interface globais, como o tema, o menu e os modais.

/**
 * Inicializa a funcionalidade de alternância de tema (claro/escuro).
 */
export function initializeTheme() {
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');

    const enableDarkMode = () => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if(themeIconLight) themeIconLight.classList.add('hidden');
        if(themeIconDark) themeIconDark.classList.remove('hidden');
    };
    const disableDarkMode = () => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if(themeIconLight) themeIconLight.classList.remove('hidden');
        if(themeIconDark) themeIconDark.classList.add('hidden');
    };

    if (localStorage.getItem('theme') === 'dark') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.documentElement.classList.contains('dark') ? disableDarkMode() : enableDarkMode();
        });
    }
}

/**
 * Inicializa a funcionalidade do menu lateral (abrir/fechar).
 */
export function initializeSideMenu() {
    const sideMenu = document.getElementById('side-menu');
    const openMenuButton = document.getElementById('open-menu-button');
    const closeMenuButton = document.getElementById('close-menu-button');
    const menuOverlay = document.getElementById('menu-overlay');
    
    const closeMenu = () => {
        if(sideMenu) sideMenu.classList.add('-translate-x-full');
        if(menuOverlay) menuOverlay.classList.add('hidden');
    };

    if(openMenuButton) openMenuButton.addEventListener('click', () => {
        if(sideMenu) sideMenu.classList.remove('-translate-x-full');
        if(menuOverlay) menuOverlay.classList.remove('hidden');
    });
    if(closeMenuButton) closeMenuButton.addEventListener('click', closeMenu);
    if(menuOverlay) menuOverlay.addEventListener('click', closeMenu);
    
    if(sideMenu) {
        sideMenu.addEventListener('click', (e) => {
            if (e.target.closest('a[data-page], button[data-page]')) {
                closeMenu();
            }
        });
    }

    document.querySelectorAll('.submenu-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const submenu = trigger.nextElementSibling;
            const chevron = trigger.querySelector('.chevron-icon');
            if(submenu) submenu.classList.toggle('hidden');
            if(chevron) chevron.classList.toggle('rotate-180');
        });
    });
}

/**
 * Inicializa os botões para mostrar/esconder a senha nos formulários.
 */
export function initializePasswordToggles() {
    const eyeIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>`;
    const eyeOffIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .91-3.013 3.168-5.442 6.042-6.44M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.522 5 12 5c1.555 0 3.024.412 4.312 1.134m5.228 4.132a10.003 10.003 0 01-2.25 3.134M17.75 5.25l-14 14" /></svg>`;

    function setupPasswordToggle(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        if (!input || !toggle) return;
        
        toggle.innerHTML = eyeIconSVG;
        toggle.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                toggle.innerHTML = eyeOffIconSVG;
            } else {
                input.type = 'password';
                toggle.innerHTML = eyeIconSVG;
            }
        });
    }

    setupPasswordToggle('login-password', 'login-password-toggle');
    setupPasswordToggle('register-password', 'register-password-toggle');
}

/**
 * Mostra o modal de confirmação de exclusão com uma mensagem personalizada.
 * @param {string} title - O título para o modal.
 * @param {string} message - A mensagem de confirmação.
 * @param {function} onConfirm - A função a ser executada se o utilizador confirmar.
 */
export function showDeleteConfirmation(title, message, onConfirm) {
    const modal = document.getElementById('delete-confirm-modal');
    const titleEl = document.getElementById('delete-confirm-title');
    const messageEl = document.getElementById('delete-confirm-message');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');

    if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;

    modal.style.display = 'flex';
    document.body.classList.add('overflow-hidden');

    const cleanup = () => {
        modal.style.display = 'none';
        document.body.classList.remove('overflow-hidden');
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    };
    
    document.getElementById('confirm-delete-btn').onclick = () => {
        onConfirm();
        cleanup();
    };

    document.getElementById('cancel-delete-btn').onclick = () => {
        cleanup();
    };
}

// --- NOVO: FUNÇÃO PARA MOSTRAR NOTIFICAÇÕES TOAST ---
/**
 * Mostra uma notificação toast no canto do ecrã.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success' ou 'error').
 * @param {number} duration - A duração em milissegundos.
 */
export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Cria o elemento da notificação
    const toast = document.createElement('div');
    toast.className = `toast ${type}`; // Adiciona classes de estilo
    toast.textContent = message;

    // Adiciona a notificação à página
    container.appendChild(toast);

    // Força o repaint para a animação de entrada funcionar
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Remove a notificação após a duração especificada
    setTimeout(() => {
        toast.classList.remove('show');
        // Espera a animação de saída terminar antes de remover o elemento
        toast.addEventListener('transitionend', () => {
            if (toast) {
                toast.remove();
            }
        });
    }, duration);
}

