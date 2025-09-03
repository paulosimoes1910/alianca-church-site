// js/pages/estudos.js - VERSÃO COMPLETA E ATUALIZADA

import { db, storage } from '../firebase-config.js';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCurrentUserRole, getCurrentUserName } from '../auth.js';
import { showDeleteConfirmation, showToast } from '../ui.js';

let allStudies = [];
let studiesInitialized = false;
let editingStudyId = null;
let currentStudyData = {};
let unsubscribeFromStudies = null;

const placeholderImage = 'https://placehold.co/400x200/e2e8f0/64748b?text=Preview';

export function updateEstudosUIVisibility(role) {
    const isAdminOrLeader = role === 'admin' || role === 'lider';
    const addStudyBtn = document.getElementById('add-study-btn');
    
    if (addStudyBtn) {
        addStudyBtn.classList.toggle('hidden', !isAdminOrLeader);
    }
    
    if(studiesInitialized) {
        renderStudies(allStudies);
    }
    
    const canViewStudies = true; 

    if (canViewStudies && !unsubscribeFromStudies) {
        console.log("A inicializar o listener dos estudos...");
        const q = query(collection(db, "estudos"), orderBy("createdAt", "desc"));
        unsubscribeFromStudies = onSnapshot(q, (snapshot) => {
            allStudies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderStudies(allStudies);
            if (studiesInitialized) {
                populateCategoryFilter();
            }
        }, (error) => {
            console.error("Erro no listener do Firestore (Estudos):", error);
        });
    } else if (!canViewStudies && unsubscribeFromStudies) {
        console.log("Listener de estudos desligado.");
        unsubscribeFromStudies();
        unsubscribeFromStudies = null;
        allStudies = [];
        renderStudies([]);
    }
}

function renderStudies(studies) {
    const container = document.getElementById('studies-container');
    const emptyState = document.getElementById('studies-empty-state');
    const role = getCurrentUserRole();
    const isAdminOrLeader = role === 'admin' || role === 'lider';

    if (!container || !emptyState) return;

    container.innerHTML = '';
    if (studies.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        studies.forEach(study => {
            let publishedDate = 'Data indisponível';
            if (study.createdAt && study.createdAt.toDate) {
                publishedDate = study.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
            
            const imageHtml = study.imageUrl 
                ? `<img src="${study.imageUrl}" alt="Capa do Estudo" class="w-full h-40 object-cover">`
                : '';

            const adminControls = `
                <button class="edit-study-btn p-2 rounded-full hover:bg-yellow-100" data-id="${study.id}" title="Editar Estudo">
                    <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM2 6a2 2 0 012-2h4a1 1 0 110 2H4v10h10V8a1 1 0 112 0v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                </button>
                <button class="delete-study-btn p-2 rounded-full hover:bg-red-100" data-id="${study.id}" data-filename="${study.fileName}" data-imageurl="${study.imageUrl}" title="Apagar Estudo">
                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                </button>
            `;
            
            const commentHTML = study.comment ? `<p class="text-xs mt-2 italic text-gray-500">"${study.comment}"</p>` : '';
            const actionText = 'Abrir / Baixar PDF';
            const actionIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;

            const card = `
                <div class="rounded-lg shadow-lg flex flex-col transition-all hover:shadow-2xl hover:transform hover:-translate-y-1 overflow-hidden">
                    ${imageHtml}
                    <div class="p-6 flex flex-col flex-grow bg-white">
                        <div class="flex justify-between items-start">
                            <span class="text-xs font-bold uppercase text-indigo-500 mb-2">${study.category}</span>
                            <div class="flex items-center">
                                ${isAdminOrLeader ? adminControls : ''}
                            </div>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800">${study.title}</h3>
                        ${commentHTML}
                        <div class="flex-grow"></div>
                        <div class="text-xs text-gray-500 mt-4 pt-4 border-t border-dashed border-gray-200 space-y-1">
                            <p><strong>Publicado por:</strong> ${study.publishedBy || 'Desconhecido'}</p>
                            <p><strong>Em:</strong> ${publishedDate}</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-gray-200">
                            <a href="${study.downloadURL || '#'}" target="_blank" rel="noopener noreferrer" class="study-action-btn text-sm font-semibold text-blue-500 flex items-center justify-center hover:underline" data-study-id="${study.id}">
                                ${actionIcon}
                                ${actionText}
                            </a>
                        </div>
                    </div>
                </div>`;
            container.innerHTML += card;
        });
    }
}

function updateFilters() {
    const searchInput = document.getElementById('study-search-input')?.value.toLowerCase();
    const categoryFilter = document.getElementById('study-category-filter')?.value;
    if (searchInput === undefined || categoryFilter === undefined) return;

    const filteredStudies = allStudies.filter(study => {
        const titleMatch = study.title.toLowerCase().includes(searchInput);
        const categoryMatch = categoryFilter ? study.category === categoryFilter : true;
        return titleMatch && categoryMatch;
    });
    renderStudies(filteredStudies);
}

function populateCategoryFilter() {
    const filterSelect = document.getElementById('study-category-filter');
    if (!filterSelect) return;
    
    const currentCategory = filterSelect.value;
    const categories = [...new Set(allStudies.map(study => study.category))];
    
    filterSelect.innerHTML = '<option value="">Todas as Categorias</option>';
    categories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filterSelect.appendChild(option);
    });
    filterSelect.value = currentCategory;
}

function openStudyModal(study = null) {
    const modalTitle = document.getElementById('study-modal-title');
    const form = document.getElementById('study-form');
    form.reset();
    if (study) {
        editingStudyId = study.id;
        currentStudyData = study;
        modalTitle.textContent = 'Editar Estudo';
        document.getElementById('study-title-pdf').value = study.title || '';
        document.getElementById('study-category-pdf').value = study.category || '';
        document.getElementById('study-comment-pdf').value = study.comment || '';
        document.getElementById('study-image-preview-pdf').src = study.imageUrl || placeholderImage;
        document.getElementById('study-file').required = false;
    } else {
        editingStudyId = null;
        currentStudyData = {};
        modalTitle.textContent = 'Adicionar Novo Estudo';
        document.getElementById('study-image-preview-pdf').src = placeholderImage;
        document.getElementById('study-file').required = true;
    }
    document.getElementById('study-modal').classList.remove('hidden');
    document.getElementById('study-modal-overlay').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeStudyModal() {
    document.getElementById('study-modal').classList.add('hidden');
    document.getElementById('study-modal-overlay').classList.add('hidden');
    document.getElementById('study-form').reset();
    document.getElementById('study-upload-progress-container').classList.add('hidden');
    document.getElementById('study-image-preview-pdf').src = placeholderImage;
    document.body.classList.remove('overflow-hidden');
}

async function uploadFile(file, path, onProgress) {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { console.error("Upload failed:", error); reject(error); },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({ downloadURL, fileName });
            }
        );
    });
}

export function initializeEstudosPage(params = {}) {
    if (!document.getElementById('studies-container')) {
        return;
    }

    if (studiesInitialized) {
        updateFilters();
        return;
    }
    
    document.getElementById('study-search-input').addEventListener('input', updateFilters);
    document.getElementById('study-category-filter').addEventListener('change', updateFilters);
    document.getElementById('add-study-btn').addEventListener('click', () => openStudyModal());
    document.getElementById('close-study-modal').addEventListener('click', closeStudyModal);
    document.getElementById('cancel-study-btn').addEventListener('click', closeStudyModal);
    document.getElementById('study-modal-overlay').addEventListener('click', closeStudyModal);
    
    const setupImagePreview = (inputId, previewId) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (input && preview) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    preview.src = URL.createObjectURL(file);
                }
            });
        }
    };
    setupImagePreview('study-image-input-pdf', 'study-image-preview-pdf');

    document.getElementById('studies-container').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-study-btn');
        const editBtn = e.target.closest('.edit-study-btn');
        
        if (deleteBtn) {
            const studyId = deleteBtn.dataset.id;
            const studyToDelete = allStudies.find(s => s.id === studyId);
            if (!studyToDelete) return;

            showDeleteConfirmation('Apagar Estudo', `Tem a certeza de que quer apagar "${studyToDelete.title}"?`, async () => {
                try {
                    await deleteDoc(doc(db, "estudos", studyId));
                    if (studyToDelete.fileName) {
                        const pdfRef = ref(storage, `estudos/${studyToDelete.fileName}`);
                        await deleteObject(pdfRef).catch(err => console.error("PDF não encontrado ou erro ao apagar:", err));
                    }
                    if (studyToDelete.imageUrl) {
                        const imageRef = ref(storage, studyToDelete.imageUrl);
                        await deleteObject(imageRef).catch(err => console.error("Imagem não encontrada ou erro ao apagar:", err));
                    }
                    showToast('Estudo apagado com sucesso!');
                } catch (error) {
                    console.error("Erro ao apagar estudo:", error);
                    showToast('Erro ao apagar o estudo.', 'error');
                }
            });
        }
        if (editBtn) {
            const studyId = editBtn.dataset.id;
            const studyToEdit = allStudies.find(s => s.id === studyId);
            if (studyToEdit) openStudyModal(studyToEdit);
        }
    });

    document.getElementById('study-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-study-btn');
        const progressContainer = document.getElementById('study-upload-progress-container');
        const progressBar = document.getElementById('study-upload-progress-bar');
        const progressText = document.getElementById('study-upload-progress-text');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'A guardar...';
        progressContainer.classList.remove('hidden');
        
        let imageProgress = 0;
        let pdfProgress = 0;
        const imageFile = document.getElementById('study-image-input-pdf').files[0];
        const pdfFile = document.getElementById('study-file').files[0];

        if (!imageFile) imageProgress = 100;
        if (!pdfFile && editingStudyId) pdfProgress = 100;

        const updateTotalProgress = () => {
            const totalProgress = (imageProgress / 2) + (pdfProgress / 2);
            progressBar.style.width = `${totalProgress}%`;
            progressText.textContent = `Progresso Total: ${Math.round(totalProgress)}%`;
        };
        
        updateTotalProgress();

        try {
            const title = document.getElementById('study-title-pdf').value;
            const category = document.getElementById('study-category-pdf').value;
            const comment = document.getElementById('study-comment-pdf').value;
            
            let imageUrl = editingStudyId ? currentStudyData.imageUrl : null;
            let fileName = editingStudyId ? currentStudyData.fileName : null;
            let downloadURL = editingStudyId ? currentStudyData.downloadURL : null;
            
            if (editingStudyId && imageFile && currentStudyData.imageUrl) {
                const oldImageRef = ref(storage, currentStudyData.imageUrl);
                await deleteObject(oldImageRef).catch(err => console.error("Erro ao apagar imagem antiga:", err));
            }
            if (editingStudyId && pdfFile && currentStudyData.fileName) {
                const oldPdfRef = ref(storage, `estudos/${currentStudyData.fileName}`);
                await deleteObject(oldPdfRef).catch(err => console.error("Erro ao apagar PDF antigo:", err));
            }

            if (imageFile) {
                progressText.textContent = 'A carregar imagem...';
                const uploadResult = await uploadFile(imageFile, 'study_images', (progress) => {
                    imageProgress = progress;
                    updateTotalProgress();
                });
                if (uploadResult) imageUrl = uploadResult.downloadURL;
            }
            
            if (pdfFile) {
                progressText.textContent = 'A carregar PDF...';
                const pdfUploadResult = await uploadFile(pdfFile, 'estudos', (progress) => {
                    pdfProgress = progress;
                    updateTotalProgress();
                });
                if (pdfUploadResult) {
                    downloadURL = pdfUploadResult.downloadURL;
                    fileName = pdfUploadResult.fileName;
                }
            }

            if (!downloadURL && !editingStudyId) throw new Error("Por favor, selecione um ficheiro PDF.");
    
            let studyData = { title, category, comment, imageUrl, downloadURL, fileName, publishedBy: getCurrentUserName(), updatedAt: serverTimestamp(), type: 'pdf' };
    
            progressText.textContent = 'A finalizar...';
            if (editingStudyId) {
                await updateDoc(doc(db, "estudos", editingStudyId), studyData);
                showToast('Estudo atualizado com sucesso!');
            } else {
                studyData.createdAt = serverTimestamp();
                await addDoc(collection(db, "estudos"), studyData);
                showToast('Estudo guardado com sucesso!');
            }
            
            closeStudyModal();
    
        } catch (error) {
            console.error("Erro ao guardar estudo:", error);
            showToast(`Erro: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Estudo';
            progressContainer.classList.add('hidden');
        }
    });

    studiesInitialized = true;
}

