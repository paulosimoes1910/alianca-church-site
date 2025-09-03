// js/pages/leader.js
// Este ficheiro gere a lógica das páginas da área do Líder.

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { getCurrentUserGCId } from '../auth.js';
import { showDeleteConfirmation } from '../ui.js';
import { openEditMemberModal } from './admin.js';
// --- MUDANÇA 1: Importar a função de notificação ---
import { showNotification } from '../notifications.js';


// Variáveis de estado do módulo
let meuGcInitialized = false;
let novosCadastrosInitialized = false;
let allMeuGCMembros = [];
let allNovosCadastros = [];

/**
 * Normaliza uma string para pesquisa (remove acentos e converte para minúsculas).
 * @param {string} str - A string a ser normalizada.
 * @returns {string} A string normalizada.
 */
function normalizeString(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Renderiza a lista de membros que pertencem ao GC do líder logado.
 * @param {Array} membros - A lista de membros a ser mostrada.
 */
function renderMeuGCMembros(membros) {
    const meuGcContainer = document.getElementById('meu-gc-container');
    const meuGcVazio = document.getElementById('meu-gc-vazio');
    const meuGcSearch = document.getElementById('meu-gc-search');

    if (!meuGcContainer || !meuGcVazio) return;

    if (membros.length === 0) {
        meuGcVazio.classList.remove('hidden');
        meuGcContainer.innerHTML = '';
        meuGcVazio.querySelector('p').textContent = meuGcSearch.value ? 'Nenhum membro encontrado com esse nome.' : 'Ainda não há membros no seu GC.';
    } else {
        meuGcVazio.classList.add('hidden');
        meuGcContainer.innerHTML = '';
        membros.forEach(membro => {
            const fullPhoneNumber = (String(membro.country_code || '') + String(membro.telefone || '')).replace(/\D/g, '');
            const whatsappLink = `https://wa.me/${fullPhoneNumber}`;
            const formattedDate = membro.data_nascimento ? new Date(membro.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
            
            const card = `
                <div class="card rounded-lg shadow-md p-6 flex flex-col text-center space-y-3">
                    <h3 class="font-bold text-xl primary-text">${membro.nome || 'N/A'}</h3>
                    <div class="border-t border-dashed pt-3 space-y-1 text-sm text-left w-full" style="border-color: var(--border-color);">
                        <p><strong>Nasc:</strong> ${formattedDate}</p>
                        <p><strong>Email:</strong> ${membro.email || 'N/A'}</p>
                        <p><strong>Tel:</strong> ${membro.country_code || ''} ${membro.telefone || 'N/A'}</p>
                        <p><strong>Endereço:</strong> ${membro.endereco || 'N/A'}, ${membro.post_cod || 'N/A'}</p>
                    </div>
                    <div class="flex-grow"></div>
                    <div class="flex justify-between items-center w-full pt-3 mt-auto border-t" style="border-color: var(--border-color);">
                        <a href="${whatsappLink}" target="_blank" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 mr-2">WhatsApp</a>
                        <div class="flex items-center space-x-2">
                            <button class="edit-member-btn p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50" data-id="${membro.id}" title="Editar Membro">
                                <svg class="w-5 h-5 primary-text" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                            </button>
                            <button class="delete-member-btn p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" data-id="${membro.id}" title="Apagar Membro">
                                <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>`;
            meuGcContainer.innerHTML += card;
        });
    }
}

/**
 * Renderiza a lista de novos cadastros que ainda não foram atribuídos a nenhum GC.
 * @param {Array} cadastros - A lista de cadastros a ser mostrada.
 */
function renderNovosCadastros(cadastros) {
    const novosCadastrosContainer = document.getElementById('novos-cadastros-container');
    const novosCadastrosVazio = document.getElementById('novos-cadastros-vazio');
    const novosCadastrosSearch = document.getElementById('novos-cadastros-search');

    if (!novosCadastrosContainer || !novosCadastrosVazio) return;

    if (cadastros.length === 0) {
        novosCadastrosVazio.classList.remove('hidden');
        novosCadastrosContainer.innerHTML = '';
        novosCadastrosVazio.querySelector('p').textContent = novosCadastrosSearch.value ? 'Nenhum resultado encontrado.' : 'Não há novos cadastros para analisar.';
    } else {
        novosCadastrosVazio.classList.add('hidden');
        novosCadastrosContainer.innerHTML = '';
        cadastros.forEach(cadastro => {
            const formattedDate = cadastro.data_nascimento ? new Date(cadastro.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
            const card = `
                <div class="card rounded-lg shadow-md p-6 space-y-3">
                    <h3 class="font-bold text-lg primary-text">${cadastro.nome || 'N/A'}</h3>
                    <div class="border-t border-dashed pt-3 space-y-1 text-sm text-left" style="border-color: var(--border-color);">
                        <p><strong>Nasc:</strong> ${formattedDate}</p>
                        <p><strong>Email:</strong> ${cadastro.email || 'N/A'}</p>
                        <p><strong>Tel:</strong> ${cadastro.country_code || ''} ${cadastro.telefone || 'N/A'}</p>
                        <p><strong>Endereço:</strong> ${cadastro.endereco || 'N/A'}, ${cadastro.post_cod || 'N/A'}</p>
                    </div>
                    <div class="border-t border-dashed pt-3" style="border-color: var(--border-color);">
                        <button data-id="${cadastro.id}" class="assign-gc-btn w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition" style="background-color: var(--menu-link-color);">Atribuir ao meu GC</button>
                    </div>
                </div>`;
            novosCadastrosContainer.innerHTML += card;
        });
    }
}

/**
 * Inicializa a página "Meu GC".
 */
export function initializeMeuGcPage() {
    if (meuGcInitialized) return;
    
    const meuGcSearch = document.getElementById('meu-gc-search');
    const meuGcContainer = document.getElementById('meu-gc-container');
    
    if(meuGcSearch) {
        meuGcSearch.addEventListener('input', (e) => {
            const searchTerm = normalizeString(e.target.value);
            const filteredMembros = allMeuGCMembros.filter(membro => normalizeString(membro.nome).includes(searchTerm));
            renderMeuGCMembros(filteredMembros);
        });
    }

    if (meuGcContainer) {
        meuGcContainer.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-member-btn');
            const deleteButton = e.target.closest('.delete-member-btn');

            if (editButton) {
                const memberId = editButton.dataset.id;
                const memberData = allMeuGCMembros.find(m => m.id === memberId);
                if (memberData) {
                    openEditMemberModal(memberData);
                }
            }

            if (deleteButton) {
                const memberId = deleteButton.dataset.id;
                const memberData = allMeuGCMembros.find(m => m.id === memberId);
                if (memberData) {
                    showDeleteConfirmation(
                        "Remover Membro",
                        `Tem a certeza de que quer remover "${memberData.nome}" do seu GC? Isto irá apagar o cadastro dele.`,
                        () => {
                            deleteDoc(doc(db, "cadastros", memberId))
                                .then(() => {
                                    showNotification('Sucesso!', 'Membro removido e cadastro apagado com sucesso.');
                                })
                                .catch(err => {
                                    console.error("Erro ao apagar membro:", err);
                                    showNotification('Erro', 'Não foi possível remover o membro.');
                                });
                        }
                    );
                }
            }
        });
    }

    const currentUserGCId = getCurrentUserGCId();
    if (!db || !currentUserGCId) {
        if (meuGcContainer) {
            meuGcContainer.innerHTML = '<p class="p-4 text-center text-red-500">Não foi possível carregar os dados do seu GC. Verifique se você é um líder com um GC atribuído.</p>';
        }
        return;
    };

    const q = query(collection(db, "cadastros"), where("gc_id", "==", currentUserGCId));
    onSnapshot(q, (querySnapshot) => {
        allMeuGCMembros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMeuGCMembros(allMeuGCMembros);
    }, (error) => console.error("Error fetching 'Meu GC' data:", error));

    meuGcInitialized = true;
}

/**
 * Inicializa a página "Novos Cadastros".
 */
export function initializeNovosCadastrosPage() {
    if (novosCadastrosInitialized) return;

    const novosCadastrosSearch = document.getElementById('novos-cadastros-search');
    const novosCadastrosContainer = document.getElementById('novos-cadastros-container');
    
    if(novosCadastrosSearch) {
        novosCadastrosSearch.addEventListener('input', (e) => {
            const searchTerm = normalizeString(e.target.value);
            const filteredCadastros = allNovosCadastros.filter(cadastro => normalizeString(cadastro.nome).includes(searchTerm));
            renderNovosCadastros(filteredCadastros);
        });
    }

    if(novosCadastrosContainer) {
        novosCadastrosContainer.addEventListener('click', async (e) => {
            const assignButton = e.target.closest('.assign-gc-btn');
            const currentUserGCId = getCurrentUserGCId();
            if (assignButton && currentUserGCId) {
                assignButton.disabled = true; // Desativa o botão para evitar cliques duplos
                assignButton.textContent = 'A atribuir...';

                const docId = assignButton.dataset.id;
                try {
                    await updateDoc(doc(db, "cadastros", docId), { gc_id: currentUserGCId });
                    // --- MUDANÇA 2: Adicionar notificação de sucesso ---
                    showNotification('Sucesso!', 'Membro atribuído ao seu GC com sucesso!');
                } catch (error) {
                    console.error("Error assigning member:", error);
                    // --- MUDANÇA 3: Adicionar notificação de erro ---
                    showNotification('Erro', 'Não foi possível atribuir o membro.');
                    assignButton.disabled = false; // Reativa o botão em caso de erro
                    assignButton.textContent = 'Atribuir ao meu GC';
                }
            }
        });
    }

    const q = query(collection(db, "cadastros"), where("gc_id", "==", null));
    onSnapshot(q, (querySnapshot) => {
        allNovosCadastros = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNovosCadastros(allNovosCadastros);
    }, (error) => console.error("Error fetching new registrations:", error));

    novosCadastrosInitialized = true;
}

