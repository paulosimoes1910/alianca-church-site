// js/pages/lideres.js
// Este ficheiro gere a lógica da página pública "Nossos Líderes".

import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { showNotification } from '../notifications.js';

let unsubscribe = null; // Para gerir a subscrição em tempo real
let lideresGcInitialized = false;

/**
 * Inicializa a página que mostra os líderes de GC.
 * Esta função agora lê da coleção pública 'publicProfiles' para evitar erros de permissão.
 */
export function initializeGcLideresPage() {
    if (lideresGcInitialized && unsubscribe) return; // Não reinicializa se já estiver a correr

    const container = document.getElementById('lideres-gc-container');
    if (!container) {
        console.error("Container de líderes não encontrado.");
        return;
    }

    container.innerHTML = `<p class="col-span-full text-center text-gray-500">A carregar perfis dos líderes...</p>`;

    // Query para buscar todos os documentos da coleção pública 'publicProfiles', ordenados por nome.
    const q = query(collection(db, "publicProfiles"), orderBy("name", "asc"));

    // Ouve as alterações na coleção em tempo real.
    unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500">Nenhum líder encontrado.</p>`;
            return;
        }

        let leadersHTML = '';
        snapshot.forEach(doc => {
            const leader = doc.data();
            const hasPhone = leader.telefone && leader.telefone.trim() !== '';
            const hasAddress = (leader.endereco && leader.endereco.trim() !== '') && (leader.post_cod && leader.post_cod.trim() !== '');

            // Botão do WhatsApp (fica desativado se não houver telefone)
            const whatsappBtn = hasPhone
                ? `<a href="https://wa.me/${leader.telefone.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="flex-1 text-center flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors text-sm font-medium">
                       <i class="fab fa-whatsapp"></i> WhatsApp
                   </a>`
                : `<button disabled class="flex-1 text-center flex items-center justify-center gap-2 bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed text-sm font-medium">
                       <i class="fab fa-whatsapp"></i> WhatsApp
                   </button>`;

            // Botão do Google Maps (fica desativado se não houver endereço)
            const mapsBtn = hasAddress
                ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(leader.endereco + ', ' + leader.post_cod)}" target="_blank" rel="noopener noreferrer" class="flex-1 text-center flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm font-medium">
                       <i class="fas fa-map-marker-alt"></i> Mapa
                   </a>`
                : `<button disabled class="flex-1 text-center flex items-center justify-center gap-2 bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed text-sm font-medium">
                       <i class="fas fa-map-marker-alt"></i> Mapa
                   </button>`;

            // Gera o HTML para o cartão de cada líder
            leadersHTML += `
              <div class="card rounded-lg shadow-md p-6 text-left flex flex-col space-y-4">
                  <h3 class="font-bold text-xl text-center primary-text border-b pb-3 mb-2">${leader.name}</h3>
                  <div class="space-y-1 text-sm flex-grow">
                      <p><strong class="font-semibold">Endereço:</strong> ${leader.endereco || 'Não informado'}</p>
                      <p><strong class="font-semibold">Cód. Postal:</strong> ${leader.post_cod || 'Não informado'}</p>
                  </div>
                  <div class="flex justify-center items-center space-x-2 pt-4 border-t mt-auto">
                      ${whatsappBtn}
                      ${mapsBtn}
                  </div>
              </div>
            `;
        });
        container.innerHTML = leadersHTML;

    }, (error) => {
        // Mostra uma mensagem de erro clara se a leitura falhar.
        console.error("Erro ao carregar perfis públicos dos líderes:", error);
        container.innerHTML = `<p class="col-span-full text-center text-red-500">Ocorreu um erro ao carregar os líderes. Verifique as regras de segurança da coleção 'publicProfiles'.</p>`;
        showNotification('Erro', 'Não foi possível carregar os perfis dos líderes.');
    });

    lideresGcInitialized = true;
}
