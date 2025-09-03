import { collection, onSnapshot, query, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { db } from '../firebase-config.js';
import { getCurrentUserRole, getCurrentUserName } from '../auth.js';
import { showToast } from '../ui.js';
import { showDeleteConfirmation } from '../ui.js';

let allPastores = [];
let pastoresInitialized = false;
let unsubscribeFromPastores = null;

/**
 * Controla a visibilidade dos elementos da UI da página de pastores com base na função do utilizador.
 * @param {string} role - A função do utilizador atual ('admin', 'lider', etc.).
 */
export function updatePastoresUIVisibility(role) {
    const isAdmin = role === 'admin';
    const addPastorBtn = document.getElementById('add-pastor-btn');

    if (addPastorBtn) {
        // CORREÇÃO APLICADA AQUI: Usar classList.toggle em vez de style.display
        // para funcionar corretamente com as classes do Tailwind CSS.
        addPastorBtn.classList.toggle('hidden', !isAdmin);
    }

    // Re-renderiza os cards para mostrar ou esconder os controlos de admin
    if (pastoresInitialized) {
        renderPastores(allPastores);
    }
}

/**
 * Renderiza a lista de pastores no container apropriado.
 * @param {Array} pastores - A lista de objetos de pastores.
 */
function renderPastores(pastores) {
    const container = document.getElementById('pastores-container');
    if (!container) return;

    const role = getCurrentUserRole();
    const isAdmin = role === 'admin';

    container.innerHTML = '';
    if (pastores.length === 0) {
        container.innerHTML = '<p class="text-center col-span-full">Nenhum pastor encontrado.</p>';
        return;
    }

    const sortedPastores = [...pastores].sort((a, b) => a.name.localeCompare(b.name));

    sortedPastores.forEach(pastor => {
        const adminControls = isAdmin ? `
            <div class="absolute top-2 right-2 flex space-x-1 bg-white/70 backdrop-blur-sm p-1 rounded-full">
                <button class="delete-pastor-btn p-2 rounded-full hover:bg-gray-200" data-id="${pastor.id}" title="Apagar Pastor">
                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                </button>
            </div>
        ` : '';

        const whatsappNumber = pastor.telefone ? pastor.telefone.replace(/\D/g, '') : '';
        const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#';
        const whatsappButton = whatsappNumber ? `<a href="${whatsappLink}" target="_blank" class="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"><i class="fab fa-whatsapp mr-2"></i>WhatsApp</a>` : '';

        const cardHTML = `
            <div class="bg-white rounded-lg shadow-md p-6 text-center relative">
                ${adminControls}
                <img src="${pastor.photoURL || 'https://placehold.co/128x128'}" alt="Foto de ${pastor.name}" class="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-gray-200">
                <h3 class="text-xl font-bold text-gray-800">${pastor.name}</h3>
                <p class="text-gray-500">${pastor.role}</p>
                ${whatsappButton}
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

function openAddPastorModal() {
    const modal = document.getElementById('add-pastor-modal');
    const overlay = document.getElementById('add-pastor-modal-overlay');
    if (!modal || !overlay) return;
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeAddPastorModal() {
    const modal = document.getElementById('add-pastor-modal');
    const overlay = document.getElementById('add-pastor-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    document.getElementById('add-pastor-form').reset();
    document.getElementById('add-pastor-img-preview').src = 'https://placehold.co/128x128/DBEAFE/1E40AF?text=?';
    document.getElementById('add-pastor-progress-container').classList.add('hidden');
}

export function initializePastoresPage() {
    if (pastoresInitialized) {
        renderPastores(allPastores);
        return;
    }
    
    if (!document.getElementById('pastores-container')) return;
    
    if (!unsubscribeFromPastores) {
        const q = query(collection(db, "pastores"));
        unsubscribeFromPastores = onSnapshot(q, (snapshot) => {
            allPastores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderPastores(allPastores);
        }, (error) => {
            console.error("Erro ao carregar pastores:", error);
        });
    }

    const container = document.getElementById('pastores-container');
    container.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-pastor-btn');
        if (!deleteBtn) return;

        const docId = deleteBtn.dataset.id;
        const pastorData = allPastores.find(p => p.id === docId);
        if (!pastorData) return;

        showDeleteConfirmation(
            'Apagar Pastor',
            `Tem a certeza de que quer apagar o perfil de "${pastorData.name}"?`,
            async () => {
                try {
                    await deleteDoc(doc(db, "pastores", docId));
                    if (pastorData.photoURL && pastorData.photoURL.includes('firebasestorage')) {
                        const storage = getStorage();
                        const photoRef = ref(storage, pastorData.photoURL);
                        await deleteObject(photoRef).catch(err => console.error("Imagem não encontrada ou erro ao apagar:", err));
                    }
                    showToast('Perfil apagado com sucesso.');
                } catch (error) {
                    console.error("Erro ao apagar perfil:", error);
                    showToast('Não foi possível apagar o perfil.', 'error');
                }
            }
        );
    });

    document.getElementById('add-pastor-btn')?.addEventListener('click', openAddPastorModal);
    document.getElementById('close-add-pastor-modal')?.addEventListener('click', closeAddPastorModal);
    document.getElementById('cancel-add-pastor-btn')?.addEventListener('click', closeAddPastorModal);
    document.getElementById('add-pastor-modal-overlay')?.addEventListener('click', closeAddPastorModal);

    const addPastorForm = document.getElementById('add-pastor-form');
    if (addPastorForm) {
        const fileInput = addPastorForm.querySelector('#add-pastor-file-input');
        const imgPreview = addPastorForm.querySelector('#add-pastor-img-preview');

        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                imgPreview.src = URL.createObjectURL(file);
            }
        });

        addPastorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('add-pastor-name').value;
            const title = document.getElementById('add-pastor-title').value; 
            const countryCode = document.getElementById('add-pastor-country-code').value;
            const telefone = document.getElementById('add-pastor-telefone').value;
            const file = fileInput.files[0];

            if (!name || !title || !telefone || !file) {
                showToast('Por favor, preencha todos os campos e selecione uma imagem.', 'error');
                return;
            }

            const progressContainer = document.getElementById('add-pastor-progress-container');
            const progressBar = document.getElementById('add-pastor-progress-bar');
            
            try {
                const newDocRef = doc(collection(db, "pastores"));
                
                progressContainer.classList.remove('hidden');
                progressBar.style.width = '0%';
                
                const storage = getStorage();
                const storageRef = ref(storage, `pastor_photos/${newDocRef.id}/${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);

                const downloadURL = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            progressBar.style.width = progress + '%';
                        }, 
                        (error) => reject(error),
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(url);
                        }
                    );
                });
                
                const pastorData = {
                    name,
                    telefone: `${countryCode}${telefone}`,
                    role: title,
                    id: newDocRef.id,
                    photoURL: downloadURL,
                    publishedBy: getCurrentUserName(),
                    createdAt: serverTimestamp()
                };
                
                await setDoc(newDocRef, pastorData);
                showToast('Novo perfil de pastor guardado com sucesso.');
                closeAddPastorModal();

            } catch (error) {
                console.error("Erro ao guardar perfil de pastor:", error);
                showToast(`Não foi possível guardar o perfil.`, 'error');
                progressContainer.classList.add('hidden');
            }
        });
    }

    pastoresInitialized = true;
    updatePastoresUIVisibility(getCurrentUserRole());
}
