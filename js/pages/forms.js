// Lógica para a criação e gestão de formulários de inscrição.

console.log("Ficheiro forms.js carregado com sucesso.");

import { db } from '../firebase-config.js';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, getDocs, deleteDoc, doc, updateDoc, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { navigateToPage } from '../navigation.js';
import { showDeleteConfirmation } from '../ui.js';
import { createMemberAccountFromSubmission } from '../auth.js';
import { showNotification } from '../notifications.js';

let allForms = [];
let allInscritos = [];
let formsInitialized = false;
let currentFormFields = [];
let unsubscribeFromForms;
let unsubscribeFromInscritos;
let unsubscribeFromCadastros;

// --- Funções Auxiliares ---
function normalizeString(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// --- Renderização da Lista de Formulários ---
function renderFormsList() {
    const container = document.getElementById('forms-list-container');
    if (!container) return;
    container.innerHTML = '';
    if (allForms.length === 0) {
        container.innerHTML = '<p class="text-center p-4">Nenhum formulário criado ainda. Clique em "Criar Formulário" para começar.</p>';
        return;
    }
    allForms.forEach(form => {
        const registrationLink = `${window.location.origin}${window.location.pathname}?formId=${form.id}`;
        const card = `
            <div class="card rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h4 class="font-bold text-lg primary-text">${form.title}</h4>
                    <p class="text-xs font-mono">${form.id}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button class="view-inscritos-btn text-sm font-semibold p-2 px-4 rounded-lg text-white" style="background-color: var(--menu-link-color);" data-form-id="${form.id}" data-form-title="${form.title}">
                        Ver Inscritos (${form.inscritosCount || 0})
                    </button>
                    <button class="copy-link-btn text-sm font-semibold p-2 px-4 rounded-lg text-white" style="background-color: var(--menu-link-color);" data-link="${registrationLink}">Copiar Link</button>
                    <button class="share-link-btn p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" data-link="${registrationLink}" data-title="${form.title}" title="Compartilhar Link">
                        <svg class="w-5 h-5 primary-text" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path></svg>
                    </button>
                    <button class="edit-form-btn p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50" data-id="${form.id}" title="Editar Formulário"><svg class="w-5 h-5 primary-text" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg></button>
                    <button class="delete-form-btn p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" data-id="${form.id}" title="Apagar Formulário"><svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- Lógica do Modal Construtor de Formulários ---
function openFormBuilderModal(form = null) {
    const modal = document.getElementById('form-builder-modal');
    const overlay = document.getElementById('form-builder-modal-overlay');
    const titleInput = document.getElementById('form-builder-title');
    const idInput = document.getElementById('form-builder-id');
    if (!modal || !overlay) {
        console.error("Modal do construtor de formulários não encontrado!");
        return;
    }

    // Apenas adicionamos o listener ao container uma vez
    const buttonsContainer = document.getElementById('add-field-buttons-container');
    if (buttonsContainer && !buttonsContainer.dataset.listenerAttached) {
        buttonsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-field-btn');
            if (btn) {
                addField(btn.dataset.type, btn.dataset.label);
            }
        });
        buttonsContainer.dataset.listenerAttached = 'true';
    }

    titleInput.value = '';
    idInput.value = '';
    currentFormFields = [];
    if (form) {
        titleInput.value = form.title;
        idInput.value = form.id;
        currentFormFields = form.fields || [];
    }
    renderFormFieldsPreview();
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Usar flex para exibir
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeFormBuilderModal() {
    const modal = document.getElementById('form-builder-modal');
    const overlay = document.getElementById('form-builder-modal-overlay');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// --- Gestão de Campos do Construtor de Formulários ---
function renderFormFieldsPreview() {
    const previewContainer = document.getElementById('form-fields-preview');
    if (!previewContainer) return;
    previewContainer.innerHTML = '';
    if (currentFormFields.length === 0) {
        previewContainer.innerHTML = '<p class="text-sm text-center text-gray-400">Adicione campos ao seu formulário.</p>';
        return;
    }
    currentFormFields.forEach((field, index) => {
        const fieldTypeDisplay = field.type.replace(/_/g, ' ').toUpperCase();
        const fieldEl = document.createElement('div');
        fieldEl.className = 'card p-3 rounded-md flex items-center justify-between gap-2 animate-fade-in';
        fieldEl.innerHTML = `
            <div class="flex-grow"><input type="text" value="${field.label}" data-index="${index}" class="field-label-input form-input w-full p-1 text-sm" placeholder="Nome do Campo"></div>
            <div class="text-xs uppercase p-1 rounded" style="background-color: var(--border-color);">${fieldTypeDisplay}</div>
            <button type="button" class="remove-field-btn p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" data-index="${index}" title="Remover Campo"><svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>
        `;
        previewContainer.appendChild(fieldEl);
    });
}

function addField(type, label) {
    const newField = {
        type: type,
        label: label || `Novo Campo (${type})`,
        name: `${(label || type).toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`
    };
    currentFormFields.push(newField);
    renderFormFieldsPreview();
}

function removeField(index) {
    currentFormFields.splice(index, 1);
    renderFormFieldsPreview();
}

function updateFieldLabel(index, newLabel) {
    if (currentFormFields[index]) {
        currentFormFields[index].label = newLabel;
    }
}

// --- Lógica da Lista de Inscritos ---
function renderInscritosList(inscritos, formFields) {
    const container = document.getElementById('inscritos-list-container');
    const emptyState = document.getElementById('inscritos-empty-state');
    if (!container || !emptyState) return;
    
    container.innerHTML = '';
    if (inscritos.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    inscritos.forEach(inscrito => {
        let detailsHTML = '';
        if (formFields && formFields.length > 0 && inscrito.formData) {
            formFields.forEach(field => {
                const fieldValue = inscrito.formData[field.label];
                if (fieldValue !== undefined) {
                    detailsHTML += `<p><strong>${field.label}:</strong> ${fieldValue || 'N/A'}</p>`;
                }
            });
        } else if (inscrito.formData) {
            for (const key in inscrito.formData) {
                detailsHTML += `<p><strong>${key}:</strong> ${inscrito.formData[key] || 'N/A'}</p>`;
            }
        }

        const card = `
            <div class="card rounded-lg shadow-md p-6 space-y-3">
                <h3 class="font-bold text-lg primary-text">${inscrito.nome || 'Inscrito'}</h3>
                <div class="border-t border-dashed pt-3 space-y-1 text-sm text-left" style="border-color: var(--border-color);">${detailsHTML}</div>
                <div class="flex items-center justify-end space-x-2 pt-2">
                    <button class="share-inscrito-btn p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50" data-id="${inscrito.id}" title="Compartilhar Inscrição">
                        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path></svg>
                    </button>
                    <button class="edit-inscrito-btn p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50" data-id="${inscrito.id}"><svg class="w-5 h-5 primary-text" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg></button>
                    <button class="delete-inscrito-btn p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" data-id="${inscrito.id}"><svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg></button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- Lógica do Novo Modal de Edição Genérico ---
function openGenericEditModal(inscrito, formFields) {
    const modal = document.getElementById('generic-edit-modal');
    const overlay = document.getElementById('generic-edit-modal-overlay');
    const form = document.getElementById('generic-edit-form');
    const fieldsContainer = document.getElementById('generic-edit-form-fields');
    if (!modal || !overlay || !form || !fieldsContainer) return;

    fieldsContainer.innerHTML = '';
    form.dataset.inscritoId = inscrito.id;

    formFields.forEach(field => {
        const currentValue = inscrito.formData[field.label] || '';
        let fieldHTML = `<div><label class="block text-sm font-medium mb-1">${field.label}</label>`;
        if (field.type === 'textarea') {
            fieldHTML += `<textarea name="${field.label}" class="form-input block w-full rounded-md border p-3 shadow-sm transition" rows="4">${currentValue}</textarea>`;
        } else {
            fieldHTML += `<input type="${field.type}" name="${field.label}" value="${currentValue}" class="form-input block w-full rounded-md border p-3 shadow-sm transition">`;
        }
        fieldHTML += `</div>`;
        fieldsContainer.innerHTML += fieldHTML;
    });

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeGenericEditModal() {
    const modal = document.getElementById('generic-edit-modal');
    const overlay = document.getElementById('generic-edit-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// --- Inicialização da Página "Ver Inscritos" ---
async function initializeVerInscritosPage(formId, formTitle) {
    navigateToPage('admin-ver-inscritos');
    document.getElementById('inscritos-title').textContent = `Inscritos: ${formTitle}`;
    
    if (unsubscribeFromInscritos) unsubscribeFromInscritos();

    try {
        const formDocRef = doc(db, "registration_forms", formId);
        const formDoc = await getDoc(formDocRef);
        if (!formDoc.exists()) throw new Error("Formulário não encontrado!");
        
        const formFields = formDoc.data().fields || [];

        const inscritosQuery = query(collection(db, "inscricoes"), where("formId", "==", formId), orderBy("createdAt", "asc"));
        unsubscribeFromInscritos = onSnapshot(inscritosQuery, (snapshot) => {
            allInscritos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderInscritosList(allInscritos, formFields);
        });

        const inscritosSearchInput = document.getElementById('inscritos-search-input');
        if(inscritosSearchInput) {
            inscritosSearchInput.oninput = (e) => {
                const searchTerm = normalizeString(e.target.value);
                const filtered = allInscritos.filter(i => {
                    // Search in 'nome' field and also in all other formData values
                    const nameMatch = normalizeString(i.nome).includes(searchTerm);
                    const otherDataMatch = Object.values(i.formData).some(val => normalizeString(String(val)).includes(searchTerm));
                    return nameMatch || otherDataMatch;
                });
                renderInscritosList(filtered, formFields);
            };
        }

        const inscritosListContainer = document.getElementById('inscritos-list-container');
        if(inscritosListContainer) {
            inscritosListContainer.onclick = (e) => {
                const editBtn = e.target.closest('.edit-inscrito-btn');
                const deleteBtn = e.target.closest('.delete-inscrito-btn');
                const shareBtn = e.target.closest('.share-inscrito-btn');

                if (editBtn) {
                    const inscrito = allInscritos.find(i => i.id === editBtn.dataset.id);
                    if(inscrito) openGenericEditModal(inscrito, formFields);
                }
                if (deleteBtn) {
                    const inscrito = allInscritos.find(i => i.id === deleteBtn.dataset.id);
                    showDeleteConfirmation("Apagar Inscrição", `Tem a certeza de que quer apagar o registo de "${inscrito.nome}"?`, () => {
                        deleteDoc(doc(db, "inscricoes", inscrito.id));
                    });
                }
                if (shareBtn) {
                    const inscrito = allInscritos.find(i => i.id === shareBtn.dataset.id);
                    if (inscrito) {
                        let shareText = `Detalhes da Inscrição - ${inscrito.nome || 'Inscrito'}:\n\n`;
                        if (formFields && formFields.length > 0) {
                            formFields.forEach(field => {
                                const fieldValue = inscrito.formData[field.label];
                                if (fieldValue !== undefined) {
                                    shareText += `${field.label}: ${fieldValue}\n`;
                                }
                            });
                        } else { 
                             for (const key in inscrito.formData) {
                                shareText += `${key}: ${inscrito.formData[key]}\n`;
                            }
                        }

                        if (navigator.share) {
                            navigator.share({
                                title: `Inscrição: ${inscrito.nome}`,
                                text: shareText.trim(),
                            })
                            .then(() => showNotification('Sucesso!', 'Inscrição compartilhada.'))
                            .catch((error) => console.error('Erro ao compartilhar', error));
                        } else {
                            navigator.clipboard.writeText(shareText.trim());
                            showNotification('Partilha não suportada', 'Os detalhes foram copiados para a área de transferência.');
                        }
                    }
                }
            };
        }

    } catch (error) {
        console.error("Erro ao carregar inscritos:", error);
        document.getElementById('inscritos-list-container').innerHTML = '<p>Erro ao carregar inscritos.</p>';
    }

    const backToFormsBtn = document.getElementById('back-to-forms-btn');
    if(backToFormsBtn) backToFormsBtn.onclick = () => {
        if (unsubscribeFromInscritos) unsubscribeFromInscritos();
        navigateToPage('admin-gerir-formularios');
    };
}

// --- INICIALIZAÇÃO DA PÁGINA DE FORMULÁRIO DINÂMICO ---
export async function initializeDynamicFormPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('formId');
    
    const formWrapper = document.getElementById('dynamic-form-wrapper');
    const successWrapper = document.getElementById('dynamic-form-success');
    const closedWrapper = document.getElementById('dynamic-form-closed');
    const formTitleEl = document.getElementById('dynamic-form-title');
    const formElement = document.getElementById('dynamic-form-element');

    if (!formId || !formWrapper || !successWrapper || !formTitleEl || !formElement || !closedWrapper) {
        // Se não houver formId, não faz nada, deixa a navegação principal cuidar disso.
        return;
    }

    // Garante que só a página do formulário é visível
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('dynamic-form-page').classList.remove('hidden');

    const newRegistrationBtn = document.getElementById('new-dynamic-registration-btn');
    const closePageBtn = document.getElementById('close-page-btn');

    if (newRegistrationBtn) {
        newRegistrationBtn.onclick = () => {
            formElement.reset();
            successWrapper.classList.add('hidden');
            formWrapper.classList.remove('hidden');
        };
    }
    if (closePageBtn) {
        closePageBtn.onclick = () => {
            formWrapper.classList.add('hidden');
            successWrapper.classList.add('hidden');
            closedWrapper.classList.remove('hidden');
        };
    }

    try {
        const formDocRef = doc(db, "registration_forms", formId);
        const formDoc = await getDoc(formDocRef);
        if (!formDoc.exists()) {
            formTitleEl.textContent = "Formulário não encontrado";
            formElement.innerHTML = "<p class='text-center'>O link que usou pode estar incorreto ou o formulário pode ter sido removido.</p>";
            return;
        }
        const formData = formDoc.data();
        formTitleEl.textContent = formData.title;
        formElement.innerHTML = '';
        formData.fields.forEach(field => {
            let fieldHTML = '';
            // Usa o 'label' como o 'name' para consistência na captura de dados
            const fieldName = field.label; 
            switch (field.type) {
                case 'textarea':
                    fieldHTML = `<div><label for="${field.name}" class="block text-sm font-medium mb-1">${field.label}</label><textarea id="${field.name}" name="${fieldName}" required class="form-input block w-full rounded-md border p-3 shadow-sm transition" rows="4"></textarea></div>`;
                    break;
                case 'checkbox':
                     fieldHTML = `<div class="flex items-center"><input id="${field.name}" name="${fieldName}" type="checkbox" class="h-4 w-4 rounded border-gray-300 mr-2"><label for="${field.name}" class="text-sm font-medium">${field.label}</label></div>`;
                    break;
                case 'radio_yes_no':
                    fieldHTML = `
                        <div>
                            <label class="block text-sm font-medium mb-2">${field.label}</label>
                            <div class="flex items-center gap-4">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" id="${field.name}_yes" name="${fieldName}" value="Sim" required class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"> Sim
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" id="${field.name}_no" name="${fieldName}" value="Não" required class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"> Não
                                </label>
                            </div>
                        </div>`;
                    break;
                case 'telefone_completo':
                    fieldHTML = `<div><label for="${field.name}" class="block text-sm font-medium mb-1">${field.label}</label><div class="flex"><select name="${fieldName}_country_code" class="form-input rounded-l-md border-r-0 p-3 transition focus:z-10"><option value="+44" selected>+44</option><option value="+351">+351</option><option value="+55">+55</option><option value="+1">+1</option><option value="+244">+244</option><option value="outros">Outros</option></select><input type="text" name="${fieldName}_other_country_code" placeholder="+__" class="form-input w-20 border-x-0 p-3 transition focus:z-10 hidden"><input type="tel" name="${fieldName}_phone" required class="form-input block w-full rounded-r-md p-3 shadow-sm transition"></div></div>`;
                    break;
                case 'post_cod':
                    fieldHTML = `<div><label for="${field.name}" class="block text-sm font-medium mb-1">${field.label}</label><input type="text" id="${field.name}" name="${fieldName}" required class="form-input block w-full rounded-md border p-3 shadow-sm transition" oninput="this.value = this.value.toUpperCase()"></div>`;
                    break;
                default:
                    fieldHTML = `<div><label for="${field.name}" class="block text-sm font-medium mb-1">${field.label}</label><input type="${field.type}" id="${field.name}" name="${fieldName}" required class="form-input block w-full rounded-md border p-3 shadow-sm transition"></div>`;
            }
            formElement.innerHTML += fieldHTML;
        });
        formElement.innerHTML += `<div><button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white transition" style="background-color: var(--menu-link-color);">Enviar Inscrição</button></div>`;
        formElement.querySelectorAll('select[name$="_country_code"]').forEach(select => {
            select.addEventListener('change', (e) => {
                const otherInput = e.target.nextElementSibling;
                if (otherInput && otherInput.name.endsWith('_other_country_code')) {
                    otherInput.classList.toggle('hidden', e.target.value !== 'outros');
                }
            });
        });
        formElement.onsubmit = async (e) => {
            e.preventDefault();
            const submissionData = new FormData(formElement);
            const assembledFormData = {};
            formData.fields.forEach(field => {
                const fieldName = field.label;
                if (field.type === 'telefone_completo') {
                    const countryCode = submissionData.get(`${fieldName}_country_code`);
                    const otherCountryCode = submissionData.get(`${fieldName}_other_country_code`);
                    const phone = submissionData.get(`${fieldName}_phone`);
                    assembledFormData[fieldName] = (countryCode === 'outros' ? otherCountryCode : countryCode) + ' ' + phone;
                } else if (field.type === 'checkbox') {
                    assembledFormData[fieldName] = submissionData.has(fieldName) ? 'Sim' : 'Não';
                } else {
                    assembledFormData[fieldName] = submissionData.get(fieldName);
                }
            });
            let nome = 'Inscrito';
            for (const label in assembledFormData) {
                if (label.toLowerCase().includes('nome')) {
                    nome = assembledFormData[label];
                    break;
                }
            }
            const dataToSave = { formId: formId, formTitle: formData.title, formData: assembledFormData, createdAt: serverTimestamp(), nome: nome };
            try {
                await addDoc(collection(db, "inscricoes"), dataToSave);
                formWrapper.classList.add('hidden');
                successWrapper.classList.remove('hidden');
            } catch (error) {
                console.error("Erro ao submeter inscrição: ", error);
                showNotification('Erro', 'Ocorreu um erro ao enviar a sua inscrição. Tente novamente.');
            }
        };
    } catch (error) {
        console.error("Erro ao carregar formulário dinâmico:", error);
        formTitleEl.textContent = "Erro ao carregar";
        formElement.innerHTML = "<p class='text-center'>Não foi possível carregar o formulário. Por favor, tente novamente mais tarde.</p>";
    }
}

// --- Inicialização Principal da Página ---
export function initializeGerirFormulariosPage() {
    if (formsInitialized) return;

    if (unsubscribeFromForms) unsubscribeFromForms();
    const formsQuery = query(collection(db, "registration_forms"), orderBy("createdAt", "desc"));
    unsubscribeFromForms = onSnapshot(formsQuery, async (formsSnapshot) => {
        const formPromises = formsSnapshot.docs.map(async (formDoc) => {
            const inscritosQuery = query(collection(db, "inscricoes"), where("formId", "==", formDoc.id));
            const inscritosSnapshot = await getDocs(inscritosQuery);
            return { id: formDoc.id, ...formDoc.data(), inscritosCount: inscritosSnapshot.size };
        });
        allForms = await Promise.all(formPromises);
        renderFormsList();
    });

    // Listener para atualizar a contagem de inscritos em tempo real
    if (unsubscribeFromCadastros) unsubscribeFromCadastros();
    unsubscribeFromCadastros = onSnapshot(collection(db, "inscricoes"), async () => {
        if (allForms.length > 0) {
            const formPromises = allForms.map(async (form) => {
                const inscritosQuery = query(collection(db, "inscricoes"), where("formId", "==", form.id));
                const inscritosSnapshot = await getDocs(inscritosQuery);
                return { ...form, inscritosCount: inscritosSnapshot.size };
            });
            allForms = await Promise.all(formPromises);
            renderFormsList();
        }
    });

    const createFormBtn = document.getElementById('create-form-btn');
    if (createFormBtn) createFormBtn.addEventListener('click', () => openFormBuilderModal());

    const formsListContainer = document.getElementById('forms-list-container');
    if (formsListContainer) {
        formsListContainer.addEventListener('click', async (e) => {
            const copyBtn = e.target.closest('.copy-link-btn');
            const shareBtn = e.target.closest('.share-link-btn');
            const viewBtn = e.target.closest('.view-inscritos-btn');
            const editBtn = e.target.closest('.edit-form-btn');
            const deleteBtn = e.target.closest('.delete-form-btn');
            
            if (copyBtn) {
                navigator.clipboard.writeText(copyBtn.dataset.link)
                    .then(() => showNotification('Copiado!', 'Link copiado para a área de transferência.'))
                    .catch(err => console.error('Erro ao copiar link:', err));
            }

            if (shareBtn) {
                const link = shareBtn.dataset.link;
                const title = shareBtn.dataset.title;
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: title,
                            text: `Link para o formulário de inscrição: ${title}`,
                            url: link,
                        });
                        showNotification('Sucesso!', 'Link compartilhado.');
                    } catch (error) {
                        console.error('Erro ao compartilhar:', error);
                        // A notificação de cancelamento pode ser irritante se o utilizador cancelar de propósito
                        // showNotification('Cancelado', 'O compartilhamento foi cancelado.');
                    }
                } else {
                    navigator.clipboard.writeText(link);
                    showNotification('Partilha não suportada', 'A partilha nativa não é suportada neste navegador. O link foi copiado.');
                }
            }

            if (viewBtn) initializeVerInscritosPage(viewBtn.dataset.formId, viewBtn.dataset.formTitle);
            
            if (editBtn) {
                const form = allForms.find(f => f.id === editBtn.dataset.id);
                if (form) openFormBuilderModal(form);
            }
            
            if (deleteBtn) {
                const form = allForms.find(f => f.id === deleteBtn.dataset.id);
                showDeleteConfirmation("Apagar Formulário", `Tem a certeza que quer apagar "${form.title}" e todos os seus inscritos?`, async () => {
                    const inscritosQuery = query(collection(db, "inscricoes"), where("formId", "==", form.id));
                    const inscritosSnapshot = await getDocs(inscritosQuery);
                    const deletePromises = inscritosSnapshot.docs.map(d => deleteDoc(d.ref));
                    await Promise.all(deletePromises);
                    await deleteDoc(doc(db, "registration_forms", form.id));
                    showNotification('Apagado!', "Formulário e inscritos apagados com sucesso.");
                });
            }
        });
    }

    const closeFormBuilderModalBtn = document.getElementById('close-form-builder-modal');
    if(closeFormBuilderModalBtn) closeFormBuilderModalBtn.addEventListener('click', closeFormBuilderModal);
    const cancelFormBuilderBtn = document.getElementById('cancel-form-builder-btn');
    if(cancelFormBuilderBtn) cancelFormBuilderBtn.addEventListener('click', closeFormBuilderModal);
    const formBuilderModalOverlay = document.getElementById('form-builder-modal-overlay');
    if(formBuilderModalOverlay) formBuilderModalOverlay.addEventListener('click', closeFormBuilderModal);
          
    const previewContainer = document.getElementById('form-fields-preview');
    if(previewContainer){
        previewContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-field-btn');
            if (removeBtn) removeField(parseInt(removeBtn.dataset.index));
        });
        previewContainer.addEventListener('input', (e) => {
            const labelInput = e.target.closest('.field-label-input');
            if (labelInput) updateFieldLabel(parseInt(labelInput.dataset.index), labelInput.value);
        });
    }
    const saveFormBuilderBtn = document.getElementById('save-form-builder-btn');
    if(saveFormBuilderBtn){
        saveFormBuilderBtn.addEventListener('click', async () => {
            const title = document.getElementById('form-builder-title').value;
            const formId = document.getElementById('form-builder-id').value;
            if (!title) { 
                showNotification('Atenção', 'Por favor, insira um título para o formulário.'); 
                return; 
            }
            const formData = { title: title, fields: currentFormFields };
            try {
                if (formId) {
                    await updateDoc(doc(db, "registration_forms", formId), formData);
                    showNotification('Sucesso!', "Formulário atualizado com sucesso!");
                } else {
                    formData.createdAt = serverTimestamp();
                    await addDoc(collection(db, "registration_forms"), formData);
                    showNotification('Sucesso!', "Formulário criado com sucesso!");
                }
                closeFormBuilderModal();
            } catch (error) {
                console.error("Erro ao guardar formulário:", error);
                showNotification('Erro', "Não foi possível guardar o formulário.");
            }
        });
    }

    const genericEditForm = document.getElementById('generic-edit-form');
    if (genericEditForm) {
        genericEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inscritoId = e.target.dataset.inscritoId;
            if (!inscritoId) return;
            const formData = new FormData(e.target);
            const updatedData = {};
            let newName = null;
            for (let [key, value] of formData.entries()) {
                updatedData[key] = value;
                if (key.toLowerCase().includes('nome')) {
                    newName = value;
                }
            }
            try {
                const docRef = doc(db, "inscricoes", inscritoId);
                const updatePayload = { formData: updatedData };
                if (newName) {
                    updatePayload.nome = newName;
                }
                await updateDoc(docRef, updatePayload);
                showNotification('Sucesso!', "Inscrição atualizada com sucesso!");
                closeGenericEditModal();
            } catch (error) {
                console.error("Erro ao atualizar inscrição:", error);
                showNotification('Erro', "Não foi possível atualizar a inscrição.");
            }
        });
    }
    const closeGenericEditModalBtn = document.getElementById('close-generic-edit-modal');
    if(closeGenericEditModalBtn) closeGenericEditModalBtn.addEventListener('click', closeGenericEditModal);
    const cancelGenericEditBtn = document.getElementById('cancel-generic-edit-btn');
    if(cancelGenericEditBtn) cancelGenericEditBtn.addEventListener('click', closeGenericEditModal);
    const genericEditModalOverlay = document.getElementById('generic-edit-modal-overlay');
    if(genericEditModalOverlay) genericEditModalOverlay.addEventListener('click', closeGenericEditModal);

    formsInitialized = true;
}
