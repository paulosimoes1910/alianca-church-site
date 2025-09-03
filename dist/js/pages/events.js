// js/pages/eventos.js - VERSÃO COMPLETA E CORRIGIDA

import { db, storage } from '../firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getCurrentUserRole, getCurrentUserName } from '../auth.js';
import { showDeleteConfirmation, showToast } from '../ui.js';

let allEvents = [];
let eventsInitialized = false;
let editingEventId = null;
let currentEventData = {};
let unsubscribeFromEvents = null;

const placeholderImage = 'https://placehold.co/600x600/e2e8f0/64748b?text=Preview';

// CORRIGIDO: Garante que a função está a ser exportada
export function updateEventosUIVisibility(role) {
    const isAdminOrLeader = role === 'admin' || role === 'lider';
    const createEventBtn = document.getElementById('create-event-btn');
    
    if (createEventBtn) {
        createEventBtn.style.display = isAdminOrLeader ? 'flex' : 'none';
    }
    
    if(eventsInitialized) {
        renderEvents(allEvents);
    }
}

function renderEvents(events) {
    const container = document.getElementById('events-container');
    const emptyState = document.getElementById('events-empty-state');
    const role = getCurrentUserRole();
    const isAdminOrLeader = role === 'admin' || role === 'lider';

    if (!container || !emptyState) return;

    container.innerHTML = '';
    
    const sortedEvents = events.sort((a, b) => {
        const dateA = a.date && a.date.toDate ? a.date.toDate() : new Date(0);
        const dateB = b.date && b.date.toDate ? b.date.toDate() : new Date(0);
        return dateB - dateA;
    });

    if (sortedEvents.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        sortedEvents.forEach(event => {
            let eventDateTime = 'Data/Hora indisponível';
            if (event.date && event.date.toDate) {
                const dateOptions = { day: '2-digit', month: 'long', year: 'numeric' };
                const formattedDate = event.date.toDate().toLocaleDateString('pt-BR', dateOptions);
                const formattedTime = event.time;
                eventDateTime = `${formattedDate} às ${formattedTime}`;
            }
            
            // ▼▼▼ ALTERAÇÃO 1: Aumenta a altura da imagem de h-48 para h-56 ▼▼▼
            const imageHtml = event.imageUrl 
                ? `<img src="${event.imageUrl}" alt="Imagem do Evento" class="w-full h-56 object-cover">`
                : `<div class="w-full h-56 bg-gray-200 flex items-center justify-center text-gray-400">Sem Imagem</div>`;

            const adminControls = `
                <div class="absolute top-2 right-2 flex space-x-2">
                    <button class="edit-event-btn p-2 rounded-full bg-white bg-opacity-80 hover:bg-yellow-100 transition-colors" data-id="${event.id}" title="Editar Evento">
                        <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM2 6a2 2 0 012-2h4a1 1 0 110 2H4v10h10V8a1 1 0 112 0v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                    </button>
                    <button class="delete-event-btn p-2 rounded-full bg-white bg-opacity-80 hover:bg-red-100 transition-colors" data-id="${event.id}" data-imageurl="${event.imageUrl}" title="Apagar Evento">
                        <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
            `;
            
            // ▼▼▼ ALTERAÇÃO 2: Remove a linha "Criado por" do final do cartão ▼▼▼
            const card = `
                <div class="relative bg-white rounded-lg shadow-lg flex flex-col transition-all hover:shadow-2xl hover:transform hover:-translate-y-1 overflow-hidden">
                    ${imageHtml}
                    ${isAdminOrLeader ? adminControls : ''}
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-2">${event.title}</h3>
                        <p class="text-sm text-gray-600 mb-4 flex items-center"><i class="far fa-calendar-alt mr-2 text-indigo-500"></i>${eventDateTime}</p>
                        <p class="text-sm text-gray-600 flex items-center"><i class="fas fa-map-marker-alt mr-2 text-indigo-500"></i>${event.location}${event.endereco ? `, ${event.endereco}` : ''}${event.postCode ? `, ${event.postCode}` : ''}</p>
                    </div>
                </div>`;
            container.innerHTML += card;
        });
    }
}

function openEventModal(event = null) {
    const modalTitle = document.getElementById('event-modal-title');
    const form = document.getElementById('event-form');
    form.reset();
    if (event) {
        editingEventId = event.id;
        currentEventData = event;
        modalTitle.textContent = 'Editar Evento';
        document.getElementById('event-title').value = event.title || '';
        document.getElementById('event-date').value = event.date ? event.date.toDate().toISOString().split('T')[0] : '';
        document.getElementById('event-time').value = event.time || '';
        document.getElementById('event-location').value = event.location || '';
        document.getElementById('event-endereco').value = event.endereco || '';
        document.getElementById('event-post-cod').value = event.postCode || '';
        document.getElementById('event-image-preview').src = event.imageUrl || placeholderImage;
        document.getElementById('event-image-input').required = false;
    } else {
        editingEventId = null;
        currentEventData = {};
        modalTitle.textContent = 'Criar Novo Evento';
        document.getElementById('event-image-preview').src = placeholderImage;
        document.getElementById('event-image-input').required = true;
    }
    document.getElementById('event-modal').classList.remove('hidden');
    document.getElementById('event-modal-overlay').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeEventModal() {
    document.getElementById('event-modal').classList.add('hidden');
    document.getElementById('event-modal-overlay').classList.add('hidden');
    document.getElementById('event-form').reset();
    document.getElementById('event-image-preview').src = placeholderImage;
    document.getElementById('event-upload-progress-container').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

async function uploadImage(file, path, onProgress) {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
}

export function initializeEventosPage(params = {}) {
    if (!document.getElementById('events-container')) {
        return;
    }

    if (eventsInitialized) {
        renderEvents(allEvents);
        return;
    }

    const q = query(collection(db, "eventos"), orderBy("date", "desc"));
    unsubscribeFromEvents = onSnapshot(q, (snapshot) => {
        allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents(allEvents);
    }, (error) => {
        console.error("Erro ao carregar eventos:", error);
    });

    document.getElementById('create-event-btn').addEventListener('click', () => openEventModal());
    document.getElementById('close-event-modal').addEventListener('click', closeEventModal);
    document.getElementById('cancel-event-btn').addEventListener('click', closeEventModal);
    document.getElementById('event-modal-overlay').addEventListener('click', closeEventModal);

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
    setupImagePreview('event-image-input', 'event-image-preview');

    document.getElementById('events-container').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-event-btn');
        const editBtn = e.target.closest('.edit-event-btn');

        if (deleteBtn) {
            const eventId = deleteBtn.dataset.id;
            const eventToDelete = allEvents.find(event => event.id === eventId);
            if (!eventToDelete) return;

            showDeleteConfirmation('Apagar Evento', `Tem a certeza de que quer apagar o evento "${eventToDelete.title}"?`, async () => {
                try {
                    await deleteDoc(doc(db, "eventos", eventId));
                    if (eventToDelete.imageUrl) {
                        const imageRef = ref(storage, eventToDelete.imageUrl);
                        await deleteObject(imageRef).catch(err => console.error("Imagem não encontrada ou erro ao apagar:", err));
                    }
                    showToast('Evento apagado com sucesso!');
                } catch (error) {
                    console.error("Erro ao apagar evento:", error);
                    showToast('Erro ao apagar o evento.', 'error');
                }
            });
        }

        if (editBtn) {
            const eventId = editBtn.dataset.id;
            const eventToEdit = allEvents.find(event => event.id === eventId);
            if (eventToEdit) openEventModal(eventToEdit);
        }
    });

    document.getElementById('event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-event-btn');
        const progressContainer = document.getElementById('event-upload-progress-container');
        const progressBar = document.getElementById('event-upload-progress-bar');
        const progressText = document.getElementById('event-upload-progress-text');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'A guardar...';
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '';

        try {
            const title = document.getElementById('event-title').value;
            const dateInput = document.getElementById('event-date').value;
            const time = document.getElementById('event-time').value;
            const location = document.getElementById('event-location').value;
            const endereco = document.getElementById('event-endereco').value;
            const postCode = document.getElementById('event-post-cod').value;
            const imageFile = document.getElementById('event-image-input').files[0];

            let imageUrl = editingEventId ? currentEventData.imageUrl : null;

            if (editingEventId && imageFile && currentEventData.imageUrl) {
                const oldImageRef = ref(storage, currentEventData.imageUrl);
                await deleteObject(oldImageRef).catch(err => console.error("Erro ao apagar imagem antiga:", err));
            }

            if (imageFile) {
                progressText.textContent = 'A carregar imagem...';
                imageUrl = await uploadImage(imageFile, 'event_images', (progress) => {
                    const percentage = Math.round(progress);
                    progressBar.style.width = `${percentage}%`;
                    progressText.textContent = `A carregar imagem: ${percentage}%`;
                });
            }

            const eventDate = new Date(`${dateInput}T${time}:00`);
            
            let eventData = {
                title,
                date: eventDate,
                time,
                location,
                endereco,
                postCode,
                imageUrl,
                createdBy: getCurrentUserName(),
                updatedAt: serverTimestamp()
            };

            progressText.textContent = 'A finalizar...';
            if (editingEventId) {
                await updateDoc(doc(db, "eventos", editingEventId), eventData);
                showToast('Evento atualizado com sucesso!');
            } else {
                eventData.createdAt = serverTimestamp();
                await addDoc(collection(db, "eventos"), eventData);
                showToast('Evento criado com sucesso!');
            }
            
            closeEventModal();

        } catch (error) {
            console.error("Erro ao guardar evento:", error);
            showToast(`Erro: ${error.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar Evento';
            progressContainer.classList.add('hidden');
        }
    });

    eventsInitialized = true;
}
