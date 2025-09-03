// js/pages/videos.js
import { db } from '../firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, writeBatch, getDocs, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from '../notifications.js';
import { showDeleteConfirmation } from '../ui.js';

let videosInitialized = false;

// Função para obter o ID do vídeo do YouTube a partir da URL
function getYouTubeId(url) {
    if (!url) return null;
    let ID = '';
    const urlParts = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/|\/live\/)/);
    if (urlParts[2] !== undefined) {
        ID = urlParts[2].split(/[^0-9a-z_\-]/i)[0];
    } else {
        ID = url.split(/[^0-9a-z_\-]/i)[0];
    }
    return ID;
}

// Função para renderizar a lista de vídeos
function renderVideos(videos) {
    const container = document.getElementById('videos-list-container');
    const emptyState = document.getElementById('videos-empty-state');
    if (!container || !emptyState) return;

    container.innerHTML = '';
    if (videos.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    videos.forEach(video => {
        const videoId = getYouTubeId(video.youtubeUrl);
        const card = document.createElement('div');
        // Adiciona a classe 'video-item' e o data-id para o SortableJS
        card.className = 'card rounded-lg shadow-md p-4 flex items-center justify-between gap-4 video-item';
        card.dataset.id = video.id;
        card.innerHTML = `
            <div class="flex items-center gap-4 overflow-hidden">
                <i class="fas fa-grip-vertical drag-handle cursor-move text-gray-400" title="Mover"></i>
                <img src="https://i.ytimg.com/vi/${videoId}/default.jpg" alt="Thumbnail" class="w-24 h-16 object-cover rounded-md flex-shrink-0 bg-gray-200">
                <div class="truncate">
                    <a href="${video.youtubeUrl}" target="_blank" class="font-semibold primary-text hover:underline truncate block">${video.youtubeUrl}</a>
                    ${video.isLive ? '<span class="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full">AO VIVO</span>' : ''}
                </div>
            </div>
            <button class="delete-video-btn text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" data-id="${video.id}">
                <i class="fas fa-trash fa-fw"></i>
            </button>
        `;
        container.appendChild(card);
    });
}

// NOVA FUNÇÃO: Atualiza a ordem dos vídeos no Firestore após arrastar
async function updateVideoOrder() {
    const container = document.getElementById('videos-list-container');
    if (!container) return;
    
    const items = container.querySelectorAll('.video-item');
    const batch = writeBatch(db);
    
    items.forEach((item, index) => {
        const docId = item.dataset.id;
        if (docId) {
            const docRef = doc(db, "videos", docId);
            batch.update(docRef, { position: index });
        }
    });

    try {
        await batch.commit();
        showNotification("Sucesso!", "A ordem dos vídeos foi atualizada.");
    } catch (error) {
        console.error("Erro ao atualizar a ordem dos vídeos:", error);
        showNotification("Erro", "Não foi possível guardar a nova ordem.", "error");
    }
}

// Função principal de inicialização da página
export function initializeVideosPage() {
    if (videosInitialized) return;

    const addVideoForm = document.getElementById('add-video-form');
    const videosListContainer = document.getElementById('videos-list-container');
    
    // ATUALIZADO: Ordena pela nova propriedade 'position'
    const q = query(collection(db, "videos"), orderBy("position", "asc"));
    onSnapshot(q, (snapshot) => {
        const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderVideos(videos);
    }, (error) => {
        console.error("Erro ao carregar vídeos:", error);
        showNotification('Erro', 'Não foi possível carregar a lista de vídeos.', 'error');
    });
    
    if (addVideoForm) {
        addVideoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const urlInput = form.querySelector('#video-url-input');
            const isLiveCheckbox = form.querySelector('#is-live-checkbox');
            const addButton = form.querySelector('#add-video-btn');

            if (!urlInput || !isLiveCheckbox || !addButton) return;

            const youtubeUrl = urlInput.value.trim();
            const isLive = isLiveCheckbox.checked;

            if (!youtubeUrl || !getYouTubeId(youtubeUrl)) {
                showNotification("URL Inválida", "Por favor, insira uma URL válida do YouTube.", "error");
                return;
            }

            addButton.disabled = true;
            addButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>A Adicionar...';

            try {
                if (isLive) {
                    const batch = writeBatch(db);
                    const qLive = query(collection(db, "videos"), where("isLive", "==", true));
                    const liveDocsSnapshot = await getDocs(qLive);
                    liveDocsSnapshot.forEach(doc => batch.update(doc.ref, { isLive: false }));
                    await batch.commit();
                }

                // ATUALIZADO: Adiciona uma posição ao novo vídeo
                const videosCollection = collection(db, "videos");
                const qCount = query(videosCollection);
                const existingVideosSnapshot = await getDocs(qCount);
                const newPosition = existingVideosSnapshot.size; // A posição será o número total de vídeos

                await addDoc(videosCollection, {
                    youtubeUrl: youtubeUrl,
                    isLive: isLive,
                    createdAt: serverTimestamp(),
                    position: newPosition // Guarda a posição
                });

                showNotification("Sucesso!", "Vídeo adicionado com sucesso!");
                form.reset();

            } catch (error) {
                console.error("Erro ao adicionar vídeo:", error);
                showNotification("Erro", "Ocorreu um erro ao adicionar o vídeo.", "error");
            } finally {
                addButton.disabled = false;
                addButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar Vídeo';
            }
        });
    }

    if (videosListContainer) {
        videosListContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-video-btn');
            if (deleteBtn) {
                const videoId = deleteBtn.dataset.id;
                showDeleteConfirmation(
                    'Apagar Vídeo',
                    'Tem a certeza de que quer apagar este vídeo?',
                    async () => {
                        try {
                            await deleteDoc(doc(db, "videos", videoId));
                            showNotification("Sucesso", "Vídeo apagado com sucesso!");
                        } catch (error) {
                            console.error("Erro ao apagar vídeo: ", error);
                            showNotification("Erro", "Ocorreu um erro ao apagar o vídeo.", "error");
                        }
                    }
                );
            }
        });
    }

    // ADICIONADO: Inicializa a funcionalidade de arrastar e largar
    if (videosListContainer) {
        new Sortable(videosListContainer, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: updateVideoOrder,
        });
    }

    videosInitialized = true;
}

