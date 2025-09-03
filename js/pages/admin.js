// js/pages/admin.js
// Este ficheiro gere a lógica de todas as páginas da área de Administração.

import {
    collection, query, where, onSnapshot, doc, updateDoc, getDoc, getDocs, deleteDoc, orderBy, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { db } from '../firebase-config.js';
import { showDeleteConfirmation } from '../ui.js';
import { showNotification } from '../notifications.js';

// Variáveis de estado do módulo
let adminInitialized = {
    contas: false,
    lideres: false,
    relatorio: false
};
let allUsers = {
    pendentes: [],
    lideres: [],
    membros: []
};
let allCadastrosGeral = [];
let gcLeadersMap = {};
let listenersAttached = false; // Variável para controlar se os listeners já foram adicionados

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
 * Converte um endereço em coordenadas de latitude e longitude usando a API do Google.
 * @param {string} address - O endereço (rua, número).
 * @param {string} postCode - O código postal.
 * @returns {Promise<object|null>} Um objeto com {lat, lng} ou null se falhar.
 */
export async function geocodeAddress(address, postCode) {
    if (!address || !postCode) {
        console.warn("Endereço ou código postal em falta para geocodificação.");
        return null;
    }
    const fullAddress = `${address}, ${postCode}`;
    const apiKey = 'AIzaSyDRJa0gyIYCdS-gWCBr9gqpa9ZBDk7x9sc'; 
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return { lat: location.lat, lng: location.lng };
        } else {
            console.error('Geocodificação falhou:', data.status, data.error_message);
            return null;
        }
    } catch (error) {
        console.error('Erro durante a geocodificação:', error);
        return null;
    }
}


// --- Funções de Modais ---

function openEditUserModal(userData) {
    const modal = document.getElementById('edit-user-modal');
    const overlay = document.getElementById('edit-user-modal-overlay');
    const form = document.getElementById('edit-user-form');
    if (!modal || !overlay || !form) return;

    form.reset();
    form.dataset.originalRole = userData.role; 
    form.querySelector('#edit-user-doc-id').value = userData.id;
    form.querySelector('#edit-user-name').value = userData.name;
    form.querySelector('#edit-user-email').value = userData.email;
    form.querySelector('#edit-user-role').value = userData.role;
    
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeEditUserModal() {
    const modal = document.getElementById('edit-user-modal');
    const overlay = document.getElementById('edit-user-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

export async function openEditMemberModal(memberData) {
    await fetchGCLeaders();

    const modal = document.getElementById('edit-member-modal');
    const overlay = document.getElementById('edit-member-modal-overlay');
    const form = document.getElementById('edit-member-form');
    if (!modal || !overlay || !form) return;
    
    form.reset();
    form.querySelector('#edit-doc-id').value = memberData.id;
    form.querySelector('#edit-nome').value = memberData.nome || '';
    form.querySelector('#edit-data_nascimento').value = memberData.data_nascimento || '';
    form.querySelector('#edit-email').value = memberData.email || '';
    form.querySelector('#edit-telefone').value = `${memberData.country_code || ''}${memberData.telefone || ''}`;
    form.querySelector('#edit-endereco').value = memberData.endereco || '';
    form.querySelector('#edit-post_cod').value = memberData.post_cod || '';
    
    const gcSelect = form.querySelector('#edit-gc_id');
    gcSelect.innerHTML = '<option value="">Nenhum</option>';
    for (const gcId in gcLeadersMap) {
        const option = document.createElement('option');
        option.value = gcId;
        option.textContent = `${gcLeadersMap[gcId]}`;
        option.selected = memberData.gc_id === gcId;
        gcSelect.appendChild(option);
    }

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeEditMemberModal() {
    const modal = document.getElementById('edit-member-modal');
    const overlay = document.getElementById('edit-member-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

export function openEditProfileModal(userData) {
    const modal = document.getElementById('edit-profile-modal');
    const overlay = document.getElementById('edit-profile-modal-overlay');
    const form = document.getElementById('edit-profile-form');
    if (!modal || !overlay || !form) return;

    form.reset();
    document.getElementById('edit-profile-progress-container').classList.add('hidden');
    
    form.querySelector('#edit-profile-doc-id').value = userData.id;
    form.querySelector('#edit-profile-name').value = userData.name;
    
    const imgPreview = form.querySelector('#edit-profile-img-preview');
    imgPreview.src = userData.photoURL || 'https://placehold.co/128x128/DBEAFE/1E40AF?text=?';

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    const overlay = document.getElementById('edit-profile-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// --- Funções de Renderização ---

function renderUserList(users, container, emptyEl) {
    if (!container || !emptyEl) return;
    
    users.forEach(user => {
        const index = allUsers.pendentes.findIndex(u => u.id === user.id);
        if (index > -1) allUsers.pendentes[index] = user;
        else {
            const indexLider = allUsers.lideres.findIndex(u => u.id === user.id);
            if (indexLider > -1) allUsers.lideres[indexLider] = user;
            else {
                 if(user.role === 'pendente' && !allUsers.pendentes.some(u => u.id === user.id)) allUsers.pendentes.push(user);
                 if(user.role === 'lider' && !allUsers.lideres.some(u => u.id === user.id)) allUsers.lideres.push(user);
            }
        }
    });

    emptyEl.classList.toggle('hidden', users.length === 0);
    container.innerHTML = '';
    users.forEach(user => {
        const cardHTML = `
            <div class="card rounded-lg shadow-md p-6 space-y-3">
                <h3 class="font-bold text-lg primary-text">${user.name}</h3>
                <div class="border-t border-dashed pt-3 space-y-1 text-sm" style="border-color: var(--border-color);">
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Telefone:</strong> ${user.telefone || 'N/A'}</p>
                    <p><strong>Endereço:</strong> ${user.endereco || 'N/A'}</p>
                    <p><strong>Post. Cod:</strong> ${user.post_cod || 'N/A'}</p>
                    <p><strong>Papel:</strong> <span class="font-semibold capitalize">${user.role}</span></p>
                    ${user.role === 'lider' ? `<p><strong>GC ID:</strong> ${user.gc_id || 'N/A'}</p>` : ''}
                </div>
                <div class="flex items-center justify-end space-x-2 pt-2">
                    <button class="edit-user-btn p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50" data-id="${user.id}">
                        <svg class="w-5 h-5 primary-text" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button class="delete-user-btn p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" data-id="${user.id}">
                        <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
            </div>`;
        container.innerHTML += cardHTML;
    });
}

function renderRelatorioGeral(cadastros) {
    const containerNaoContactados = document.getElementById('admin-relatorio-nao-contactados-container');
    const emptyNaoContactados = document.getElementById('admin-relatorio-nao-contactados-vazio');
    const containerContactados = document.getElementById('admin-relatorio-contactados-container');
    const emptyContactados = document.getElementById('admin-relatorio-contactados-vazio');

    if (!containerNaoContactados || !containerContactados) return;
    containerNaoContactados.innerHTML = '';
    containerContactados.innerHTML = '';

    const naoContactados = cadastros.filter(c => !c.contacted);
    const contactados = cadastros.filter(c => c.contacted);
    
    contactados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    emptyNaoContactados.classList.toggle('hidden', naoContactados.length > 0);
    emptyContactados.classList.toggle('hidden', contactados.length > 0);

    const createCardHTML = (cadastro) => {
        const contactedClass = cadastro.contacted ? 'contacted' : '';
        const contactedChecked = cadastro.contacted ? 'checked' : '';
        const leaderName = cadastro.gc_id ? gcLeadersMap[cadastro.gc_id] : null;
        const gcDisplay = cadastro.gc_id ? `${leaderName || 'Líder Desconhecido'}` : 'Nenhum';
        const formattedDate = cadastro.data_nascimento ? new Date(cadastro.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
        const fonteHTML = cadastro.fonte_cadastro ? `<p><strong>Fonte:</strong> <span class="capitalize">${cadastro.fonte_cadastro.replace(/_/g, ' ')}</span></p>` : '';

        return `
        <div class="card rounded-lg shadow-md p-6 space-y-3 relative transition-all ${contactedClass}">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg primary-text">${cadastro.nome || 'N/A'}</h3>
                    <p class="text-sm font-semibold">GC: ${gcDisplay}</p>
                </div>
                <span class="text-sm font-mono p-1 rounded" style="background-color: var(--hover-bg-color); color: var(--primary-text-color);">#${cadastro.memberNumber || '0000'}</span>
            </div>
            <div class="border-t border-dashed pt-3 space-y-1 text-sm" style="border-color: var(--border-color);">
                <p><strong>Nasc:</strong> ${formattedDate}</p>
                <p><strong>Email:</strong> <a href="mailto:${cadastro.email}" class="hover:underline">${cadastro.email || 'N/A'}</a></p>
                <p><strong>Tel:</strong> ${cadastro.country_code || ''} ${cadastro.telefone || 'N/A'}</p>
                <p><strong>Endereço:</strong> ${cadastro.endereco || 'N/A'}, ${cadastro.post_cod || 'N/A'}</p>
                ${fonteHTML}
            </div>
            <div class="flex justify-between items-center pt-2 mt-2 border-t" style="border-color: var(--border-color);">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer contacted-toggle" data-id="${cadastro.id}" ${contactedChecked}>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    <span class="ml-3 text-xs font-semibold uppercase">Contactado</span>
                </label>
                <div class="flex items-center space-x-2">
                    <button class="edit-cadastro-btn p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50" data-id="${cadastro.id}"><svg class="w-5 h-5 primary-text" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg></button>
                    <button class="delete-cadastro-btn p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" data-id="${cadastro.id}"><svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>
                </div>
            </div>
        </div>`;
    };

    naoContactados.forEach(cadastro => containerNaoContactados.innerHTML += createCardHTML(cadastro));
    contactados.forEach(cadastro => containerContactados.innerHTML += createCardHTML(cadastro));
}

// --- Funções de Inicialização de Página ---

async function fetchGCLeaders() {
    gcLeadersMap = {}; 
    const q = query(collection(db, "users"), where("role", "in", ["lider", "admin"]));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
        const leader = doc.data();
        if (leader.gc_id) gcLeadersMap[leader.gc_id] = leader.name;
    });
}

export function initializeGerirContasPage() {
    if (adminInitialized.contas) {
        const container = document.getElementById('admin-gerir-contas-container');
        const emptyEl = document.getElementById('admin-gerir-contas-vazio');
        renderUserList(allUsers.pendentes, container, emptyEl);
        return;
    }
    const container = document.getElementById('admin-gerir-contas-container');
    const emptyEl = document.getElementById('admin-gerir-contas-vazio');
    const q = query(collection(db, "users"), where("role", "==", "pendente"));
    onSnapshot(q, (snapshot) => {
        allUsers.pendentes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUserList(allUsers.pendentes, container, emptyEl);
    }, (error) => console.error("Erro ao carregar contas pendentes:", error));
    adminInitialized.contas = true;
}

export function initializeGerirLideresPage() {
    if (adminInitialized.lideres) {
        const container = document.getElementById('admin-lideres-container');
        const emptyEl = document.getElementById('admin-lideres-vazio');
        renderUserList(allUsers.lideres, container, emptyEl);
        return;
    }
    const container = document.getElementById('admin-lideres-container');
    const emptyEl = document.getElementById('admin-lideres-vazio');
    const q = query(collection(db, "users"), where("role", "==", "lider"));
    onSnapshot(q, (snapshot) => {
        allUsers.lideres = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUserList(allUsers.lideres, container, emptyEl);
    }, (error) => console.error("Erro ao carregar líderes:", error));
    adminInitialized.lideres = true;
}

export async function initializeRelatorioGeralPage() {
    if (adminInitialized.relatorio) return;
    
    await fetchGCLeaders();
    
    const searchInput = document.getElementById('admin-relatorio-search');
    const leaderFilter = document.getElementById('admin-leader-filter');
    const tabsContainer = document.getElementById('relatorio-tabs');

    const applyFiltersAndRender = () => {
        const searchTerm = normalizeString(searchInput.value);
        const selectedGcId = leaderFilter.value;
        let filteredList = allCadastrosGeral;

        if (searchTerm) {
            filteredList = filteredList.filter(c => normalizeString(c.nome).includes(searchTerm));
        }
        if (selectedGcId !== 'todos') {
            filteredList = filteredList.filter(c => c.gc_id === selectedGcId);
        }

        renderRelatorioGeral(filteredList);
    };

    if (leaderFilter) {
        leaderFilter.innerHTML = '<option value="todos">Filtrar por todos os Líderes</option>';
        for (const gcId in gcLeadersMap) {
            const leaderName = gcLeadersMap[gcId];
            const option = document.createElement('option');
            option.value = gcId;
            option.textContent = leaderName;
            leaderFilter.appendChild(option);
        }
    }

    const q = query(collection(db, "cadastros"), where("quer_gc", "==", true), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allCadastrosGeral = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFiltersAndRender();
    }, (error) => {
        console.error("Erro ao carregar relatório geral:", error);
        const container = document.getElementById('admin-relatorio-nao-contactados-container');
        if (container) {
            let errorMessage = `<p class="text-red-500 p-4 col-span-full text-center">Erro ao carregar dados.</p>`;
            if (error.code === 'failed-precondition') {
                errorMessage += `<p class="text-sm text-center">Este erro pode significar que falta um índice no Firestore. Verifique a consola do navegador para o criar.</p>`;
            }
            container.innerHTML = errorMessage;
        }
    });

    if (searchInput) { searchInput.addEventListener('input', applyFiltersAndRender); }
    if (leaderFilter) { leaderFilter.addEventListener('change', applyFiltersAndRender); }

    if (tabsContainer) {
        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab-btn');
            if (!clickedTab) return;

            document.querySelectorAll('#relatorio-tabs .tab-btn').forEach(tab => tab.classList.remove('active-tab'));
            document.querySelectorAll('#relatorio-tab-content > div').forEach(content => content.classList.add('hidden'));

            clickedTab.classList.add('active-tab');
            document.getElementById(`tab-${clickedTab.dataset.tab}`).classList.remove('hidden');
        });
    }

    adminInitialized.relatorio = true;
}

export function initializeAdminListeners() {
    if (listenersAttached) {
        return;
    }

    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    pageContent.addEventListener('click', (e) => {
        const editUserBtn = e.target.closest('.edit-user-btn');
        const deleteUserBtn = e.target.closest('.delete-user-btn');
        
        if (editUserBtn) {
            const userId = editUserBtn.dataset.id;
            const all = [...allUsers.pendentes, ...allUsers.lideres];
            const user = all.find(u => u.id === userId);
            if (user) openEditUserModal(user);
        }

        if (deleteUserBtn) {
            const userId = deleteUserBtn.dataset.id;
            const all = [...allUsers.pendentes, ...allUsers.lideres];
            const userToDelete = all.find(u => u.id === userId);
            if (userToDelete) {
                showDeleteConfirmation(
                    'Apagar Utilizador',
                    `Tem a certeza de que quer apagar a conta de "${userToDelete.name}"? Esta ação não pode ser desfeita.`,
                    async () => {
                        try {
                            // Se o utilizador for líder ou admin, apaga também o seu perfil público
                            if (userToDelete.role === 'lider' || userToDelete.role === 'admin') {
                                await deleteDoc(doc(db, "publicProfiles", userId));
                            }
                            await deleteDoc(doc(db, "users", userId));
                            showNotification('Apagado!', 'A conta do utilizador foi apagada com sucesso.');
                        } catch (err) {
                            console.error("Erro ao apagar utilizador e perfil público:", err);
                            showNotification('Erro', 'Não foi possível apagar a conta.');
                        }
                    }
                );
            }
        }

        const deleteCadastroBtn = e.target.closest('.delete-cadastro-btn');
        const editCadastroBtn = e.target.closest('.edit-cadastro-btn');
        const contactedToggle = e.target.closest('.contacted-toggle');

        if (deleteCadastroBtn) {
            const docId = deleteCadastroBtn.dataset.id;
            const cadastroToDelete = allCadastrosGeral.find(c => c.id === docId);
            if (cadastroToDelete) {
                showDeleteConfirmation(
                    'Apagar Cadastro',
                    `Tem a certeza de que quer apagar o cadastro de "${cadastroToDelete.nome}"?`,
                    () => {
                        deleteDoc(doc(db, "cadastros", docId))
                            .then(() => showNotification('Apagado!', 'O cadastro foi apagado com sucesso.'))
                            .catch(err => {
                                console.error(err);
                                showNotification('Erro', 'Não foi possível apagar o cadastro.');
                            });
                    }
                );
            }
        }

        if (editCadastroBtn) {
            const docId = editCadastroBtn.dataset.id;
            const cadastro = allCadastrosGeral.find(c => c.id === docId);
            if (cadastro) openEditMemberModal(cadastro);
        }

        if (contactedToggle) {
            const docId = contactedToggle.dataset.id;
            const isChecked = contactedToggle.checked;
            const cadastro = allCadastrosGeral.find(c => c.id === docId);

            if (isChecked && !cadastro.gc_id) {
                contactedToggle.checked = false;
                showNotification('Ação Necessária', 'É preciso atribuir o cadastro a um GC antes de o marcar como contactado.');
                return;
            }

            updateDoc(doc(db, "cadastros", docId), { contacted: isChecked })
                .then(() => showNotification('Atualizado!', 'Status de contacto foi atualizado.'))
                .catch(err => {
                    console.error(err);
                    showNotification('Erro', 'Não foi possível atualizar o status.');
                    contactedToggle.checked = !isChecked;
                });
        }
    });

    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
        editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const docId = form.querySelector('#edit-user-doc-id').value;
            const newRole = form.querySelector('#edit-user-role').value;
            const originalRole = form.dataset.originalRole;
            const newName = form.querySelector('#edit-user-name').value;
            const updatedData = { name: newName, role: newRole };

            // Lógica para sincronizar com a coleção publicProfiles
            if (newRole !== originalRole) {
                const publicProfileRef = doc(db, "publicProfiles", docId);
                const userDocRef = doc(db, "users", docId);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Se o utilizador foi promovido a líder, cria/atualiza o perfil público
                    if (newRole === 'lider' || newRole === 'admin') {
                        console.log(`Promovendo ${userData.name} para ${newRole}. Criando perfil público...`);
                        await setDoc(publicProfileRef, {
                            name: userData.name,
                            photoURL: userData.photoURL || null,
                            endereco: userData.endereco || null,
                            post_cod: userData.post_cod || null,
                            telefone: userData.telefone || null,
                            lat: userData.lat || null,
                            lng: userData.lng || null
                        }, { merge: true });
                    } 
                    // Se o utilizador foi despromovido de líder, apaga o perfil público
                    else if (originalRole === 'lider' || originalRole === 'admin') {
                        console.log(`Despromovendo ${userData.name}. Apagando perfil público...`);
                        await deleteDoc(publicProfileRef);
                    }
                }
            }

            // Se for promovido a líder, gera GC ID e geocodifica se necessário
            if (newRole === 'lider' && originalRole !== 'lider') {
                const userDoc = await getDoc(doc(db, "users", docId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (!userData.gc_id) updatedData.gc_id = `gc_${docId.substring(0, 6)}`;
                    
                    if (!userData.lat || !userData.lng) {
                        const coordinates = await geocodeAddress(userData.endereco, userData.post_cod);
                        if (coordinates) {
                            updatedData.lat = coordinates.lat;
                            updatedData.lng = coordinates.lng;
                            // ATUALIZADO: Guarda as novas coordenadas também no perfil público
                            await updateDoc(doc(db, "publicProfiles", docId), { lat: coordinates.lat, lng: coordinates.lng });
                        } else {
                            showNotification("Atenção", "Não foi possível encontrar as coordenadas para o endereço deste líder.");
                        }
                    }
                }
            }

            try {
                await updateDoc(doc(db, "users", docId), updatedData);

                // Se o nome foi alterado e o utilizador continua líder/admin, atualiza o nome no perfil público
                const originalUser = allUsers.lideres.find(u=>u.id === docId) || allUsers.pendentes.find(u=>u.id === docId);
                if (originalUser && newName !== originalUser.name && (newRole === 'lider' || newRole === 'admin')) {
                    await updateDoc(doc(db, "publicProfiles", docId), { name: newName });
                }

                showNotification("Sucesso!", "Utilizador atualizado com sucesso.");
                
                if (originalRole === 'pendente' && newRole !== 'pendente') {
                    const all = [...allUsers.pendentes, ...allUsers.lideres, ...allUsers.membros];
                    const userData = all.find(u => u.id === docId);
                    if (userData && userData.telefone) {
                        const phoneNumber = userData.telefone.replace(/\D/g, '');
                        const message = `Olá ${userData.name}, a sua conta no site da Aliança Church foi ativada! Já pode fazer o login. https://ministerioaliancauk.com`;
                        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                    }
                }
                
                closeEditUserModal();
            } catch (error) {
                showNotification("Erro", "Ocorreu um erro ao atualizar o utilizador.");
                console.error(error);
            }
        });
    }
    
    const editMemberForm = document.getElementById('edit-member-form');
    if (editMemberForm) {
        editMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const docId = form.querySelector('#edit-doc-id').value;
            if (!docId) return;

            const fullPhone = form.querySelector('#edit-telefone').value;
            let countryCode = '+44', phone = fullPhone;
            if (fullPhone.startsWith('+')) {
                const match = fullPhone.match(/^(\+\d{1,3})(\d+)/);
                if (match) { countryCode = match[1]; phone = match[2]; }
            }

            const updatedData = {
                nome: form.querySelector('#edit-nome').value, data_nascimento: form.querySelector('#edit-data_nascimento').value,
                email: form.querySelector('#edit-email').value, country_code: countryCode, telefone: phone,
                endereco: form.querySelector('#edit-endereco').value, post_cod: form.querySelector('#edit-post_cod').value.toUpperCase(),
                gc_id: form.querySelector('#edit-gc_id').value || null,
            };
            try {
                await updateDoc(doc(db, "cadastros", docId), updatedData);
                showNotification("Sucesso!", "Cadastro atualizado com sucesso.");
                closeEditMemberModal();
            } catch (error) {
                showNotification("Erro", "Não foi possível atualizar o cadastro.");
                console.error(error);
            }
        });
    }

    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const docId = form.querySelector('#edit-profile-doc-id').value;
            const fileInput = form.querySelector('#edit-profile-file-input');
            const file = fileInput.files[0];
            const updatedName = form.querySelector('#edit-profile-name').value;

            const updateData = { name: updatedName };
            const publicUpdateData = { name: updatedName }; // Para o perfil público

            const storage = getStorage();
            const progressContainer = document.getElementById('edit-profile-progress-container');
            const progressBar = document.getElementById('edit-profile-progress-bar');
            
            const performUpdate = async () => {
                 try {
                    // Atualiza o documento privado e o público em simultâneo
                    await Promise.all([
                        updateDoc(doc(db, "users", docId), updateData),
                        updateDoc(doc(db, "publicProfiles", docId), publicUpdateData)
                    ]);
                    showNotification("Sucesso!", "Perfil atualizado com sucesso!");
                    closeEditProfileModal();
                } catch (error) {
                    console.error("Erro ao atualizar perfil:", error);
                    showNotification("Erro", "Não foi possível atualizar o perfil.");
                } finally {
                    if(progressContainer) progressContainer.classList.add('hidden');
                }
            };

            if (file) {
                const storageRef = ref(storage, `profile_photos/${docId}/${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);
                
                progressContainer.classList.remove('hidden');

                uploadTask.on('state_changed', 
                    (snapshot) => { progressBar.style.width = ((snapshot.bytesTransferred / snapshot.totalBytes) * 100) + '%'; }, 
                    (error) => { 
                        console.error("Upload failed:", error); 
                        showNotification("Erro", "Ocorreu um erro ao enviar a imagem."); 
                        progressContainer.classList.add('hidden'); 
                    }, 
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        updateData.photoURL = downloadURL;
                        publicUpdateData.photoURL = downloadURL;
                        await performUpdate();
                    }
                );
            } else {
                await performUpdate();
            }
        });
    }
    
    document.getElementById('close-edit-user-modal')?.addEventListener('click', closeEditUserModal);
    document.getElementById('cancel-edit-user-btn')?.addEventListener('click', closeEditUserModal);
    document.getElementById('edit-user-modal-overlay')?.addEventListener('click', closeEditUserModal);
    document.getElementById('close-edit-modal')?.addEventListener('click', closeEditMemberModal);
    document.getElementById('cancel-edit-btn')?.addEventListener('click', closeEditMemberModal);
    document.getElementById('edit-member-modal-overlay')?.addEventListener('click', closeEditMemberModal);
    document.getElementById('close-edit-profile-modal')?.addEventListener('click', closeEditProfileModal);
    document.getElementById('cancel-edit-profile-btn')?.addEventListener('click', closeEditProfileModal);
    document.getElementById('edit-profile-modal-overlay')?.addEventListener('click', closeEditProfileModal);

    listenersAttached = true;
}


