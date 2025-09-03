// js/pages/perfis.js
// Este ficheiro contém a lógica partilhada para renderizar cartões de perfil.

import { getCurrentUserRole } from '../auth.js';

export function populatePerfis(perfis, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const currentUserRole = getCurrentUserRole();
    const isAdmin = currentUserRole === 'admin';
    if (perfis.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center">Nenhum perfil encontrado.</p>`;
        return;
    }
    container.innerHTML = '';
    perfis.forEach(perfil => {
        const whatsappLink = `https://wa.me/${(perfil.telefone || '').replace(/\D/g, '')}`;
        
        let adminControlsHTML = '';
        let photoHTML = '';

        // ▼▼▼ ALTERAÇÃO AQUI ▼▼▼
        // Apenas mostra a foto e os controlos de admin se o perfil NÃO for de um líder.
        // Isto mantém a funcionalidade para os pastores, mas remove para os líderes.
        if (perfil.role !== 'lider') {
            if (isAdmin) {
                adminControlsHTML = `
                    <div class="absolute top-1 right-1 flex space-x-1">
                        <button class="edit-profile-btn p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-blue-100 dark:hover:bg-blue-900/50" data-id="${perfil.id}" title="Editar Perfil">
                            <svg class="w-5 h-5 primary-text" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                        </button>
                        <button class="delete-profile-btn p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-red-100 dark:hover:bg-red-900/50" data-id="${perfil.id}" data-photourl="${perfil.photoURL || ''}" title="Apagar Perfil">
                            <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                        </button>
                    </div>
                `;
            }
            photoHTML = `<img src="${perfil.photoURL || 'https://placehold.co/128x128/DBEAFE/1E40AF?text=?'}" alt="Foto de ${perfil.name}" class="w-32 h-32 rounded-full object-cover border-4 mb-4" style="border-color: var(--primary-text-color);">`;
        }
        // ▲▲▲ FIM DA ALTERAÇÃO ▲▲▲

        const enderecoHTML = perfil.endereco ? `
            <p class="text-sm mt-2 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="inline-block h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                ${perfil.endereco}, ${perfil.post_cod || ''}
            </p>
        ` : '';

        const cardHTML = `
            <div class="card rounded-lg shadow-md overflow-hidden text-center p-6 flex flex-col items-center relative">
                ${adminControlsHTML}
                ${photoHTML}
                <h3 class="text-xl font-bold primary-text">${perfil.name}</h3>
                <p class="text-sm capitalize">${perfil.role}</p>
                ${enderecoHTML}
                <div class="flex-grow"></div>
                <div class="mt-4 flex space-x-2 w-full">
                    <a href="${whatsappLink}" target="_blank" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">WhatsApp</a>
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
}

