// js/notifications.js
// Módulo para controlar a exibição de notificações personalizadas.

/**
 * Mostra uma notificação personalizada no topo da página.
 * @param {string} title - O título da notificação.
 * @param {string} message - A mensagem da notificação.
 * @param {number} duration - O tempo em milissegundos que a notificação ficará visível.
 */
export function showNotification(title, message, duration = 4000) { // Duração alterada para 4000ms (4 segundos)
    const notification = document.getElementById('custom-notification');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');

    if (!notification || !notificationTitle || !notificationMessage) {
        // Fallback para o alert normal se os elementos não existirem
        alert(`${title}\n${message}`);
        return;
    }

    // Define o texto
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;

    // Mostra a notificação
    notification.classList.add('show');

    // Esconde a notificação após a duração especificada
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

