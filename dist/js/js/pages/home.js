import { db, storage } from '../firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showToast } from '../ui.js';

let currentHomeData = {};
let homeInitialized = false;

// Função para alternar entre os formulários de upload de imagem e vídeo
function toggleBackgroundUploader(type) {
    const imageContainer = document.getElementById('hero-image-upload-container');
    const videoContainer = document.getElementById('hero-video-upload-container');

    if (imageContainer && videoContainer) {
        if (type === 'image') {
            imageContainer.classList.remove('hidden');
            videoContainer.classList.add('hidden');
        } else if (type === 'video') {
            imageContainer.classList.add('hidden');
            videoContainer.classList.remove('hidden');
        }
    }
}

// Configura os previews para os logos e fundos
function setupPreviews() {
    const setupPreview = (inputId, previewId) => {
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

    setupPreview('header-logo-input', 'header-logo-preview');
    setupPreview('hero-logo-input', 'hero-logo-preview');
    setupPreview('hero-image-input', 'hero-image-preview');
    setupPreview('hero-video-input', 'hero-video-preview');
}

// Helper function to toggle font style buttons
function setupStyleButtons() {
    document.querySelectorAll('.font-style-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
        });
    });
}


// Carrega os dados existentes da página inicial para o formulário
async function loadHomePageData() {
    try {
        const docRef = doc(db, "pages", "home");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentHomeData = docSnap.data();
            
            const safeSet = (id, property, value, fallback) => {
                const el = document.getElementById(id);
                if (el) {
                    el[property] = value || fallback;
                }
            };

            safeSet('header-logo-preview', 'src', currentHomeData.headerLogoUrl, 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo');
            safeSet('hero-logo-preview', 'src', currentHomeData.bannerLogoUrl, 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo');
            safeSet('hero-image-preview', 'src', currentHomeData.imageUrl, 'https://placehold.co/200x100/e2e8f0/64748b?text=Imagem');
            safeSet('hero-video-preview', 'src', currentHomeData.videoUrl, '');

            if (currentHomeData.titleFont) {
                safeSet('title-font-family', 'value', currentHomeData.titleFont.family, "'Inter', sans-serif");
                safeSet('title-font-size', 'value', currentHomeData.titleFont.size, '');
                document.getElementById('title-font-bold')?.classList.toggle('active', currentHomeData.titleFont.bold || false);
                document.getElementById('title-font-italic')?.classList.toggle('active', currentHomeData.titleFont.italic || false);
            }
            if (currentHomeData.subtitleFont) {
                safeSet('subtitle-font-family', 'value', currentHomeData.subtitleFont.family, "'Inter', sans-serif");
                safeSet('subtitle-font-size', 'value', currentHomeData.subtitleFont.size, '');
                document.getElementById('subtitle-font-bold')?.classList.toggle('active', currentHomeData.subtitleFont.bold || false);
                document.getElementById('subtitle-font-italic')?.classList.toggle('active', currentHomeData.subtitleFont.italic || false);
            }

            const showBannerLogoCheckbox = document.getElementById('show-banner-logo-checkbox');
            if (showBannerLogoCheckbox) {
                showBannerLogoCheckbox.checked = currentHomeData.showBannerLogo !== false;
            }

            const bgTypeVideo = document.getElementById('bg-type-video');
            const bgTypeImage = document.getElementById('bg-type-image');

            if (currentHomeData.backgroundType === 'video') {
                if (bgTypeVideo) bgTypeVideo.checked = true;
                toggleBackgroundUploader('video');
            } else {
                if (bgTypeImage) bgTypeImage.checked = true;
                toggleBackgroundUploader('image');
            }
        } else {
            toggleBackgroundUploader('image');
        }
    } catch (error) {
        console.error("Erro ao carregar dados da página inicial:", error);
        showToast("Erro ao carregar os dados da página.", "error");
    }
}

// Faz o upload de um ficheiro (imagem ou vídeo) para o Storage
async function uploadFile(file, path, namePrefix, onProgress) {
    if (!file) return null;
    const fileName = `${namePrefix}-${Date.now()}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
        );
    });
}

export function initializeHomePage() {
    if (homeInitialized) return;
    
    const saveButton = document.getElementById('save-hero-button');
    const bgTypeRadios = document.querySelectorAll('input[name="bg-type"]');
    const headerLogoInput = document.getElementById('header-logo-input');
    const bannerLogoInput = document.getElementById('hero-logo-input'); 
    const imageInput = document.getElementById('hero-image-input');
    const videoInput = document.getElementById('hero-video-input');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');

    setupStyleButtons();
    loadHomePageData().then(() => {
        if (saveButton) saveButton.disabled = false;
    });
    setupPreviews();

    if (bgTypeRadios) {
        bgTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => toggleBackgroundUploader(e.target.value));
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            saveButton.disabled = true;
            document.getElementById('save-hero-button-text').textContent = 'A guardar...';
            document.getElementById('save-hero-spinner').classList.remove('hidden');
            if (progressContainer) progressContainer.classList.remove('hidden');

            try {

                const dataToSave = {
                    title: document.getElementById('hero-title-input')?.value || '',
                    subtitle: document.getElementById('hero-subtitle-input')?.value || '',
                    backgroundType: document.querySelector('input[name="bg-type"]:checked')?.value || 'image',
                    showBannerLogo: document.getElementById('show-banner-logo-checkbox')?.checked,
                    headerLogoUrl: currentHomeData.headerLogoUrl || null,
                    bannerLogoUrl: currentHomeData.bannerLogoUrl || null,
                    imageUrl: currentHomeData.imageUrl || null,
                    videoUrl: currentHomeData.videoUrl || null,
                    lastUpdated: new Date(),
                };

                const headerLogoFile = headerLogoInput?.files[0];
                const bannerLogoFile = bannerLogoInput?.files[0];
                const imageFile = imageInput?.files[0];
                const videoFile = videoInput?.files[0];

                const onProgress = (progress) => {
                    const percentage = Math.round(progress);
                    if (progressBar) {
                        progressBar.style.width = `${percentage}%`;
                        progressBar.textContent = `${percentage}%`;
                    }
                };

                if (headerLogoFile) {
                    if (progressText) progressText.textContent = 'A carregar logo do cabeçalho...';
                    const newUrl = await uploadFile(headerLogoFile, 'site-images', 'header-logo', onProgress);
                    if (currentHomeData.headerLogoUrl) {
                        try { await deleteObject(ref(storage, currentHomeData.headerLogoUrl)); } 
                        catch (e) { console.warn("Logo antigo do cabeçalho não encontrado.", e); }
                    }
                    dataToSave.headerLogoUrl = newUrl;
                }
                
                if (bannerLogoFile) {
                    if (progressText) progressText.textContent = 'A carregar logo do banner...';
                    const newUrl = await uploadFile(bannerLogoFile, 'site-images', 'banner-logo', onProgress);
                    if (currentHomeData.bannerLogoUrl) {
                        try { await deleteObject(ref(storage, currentHomeData.bannerLogoUrl)); } 
                        catch (e) { console.warn("Logo antigo do banner não encontrado.", e); }
                    }
                    dataToSave.bannerLogoUrl = newUrl;
                }

                if (dataToSave.backgroundType === 'image' && imageFile) {
                    if (currentHomeData.videoUrl) {
                       try { await deleteObject(ref(storage, currentHomeData.videoUrl)); dataToSave.videoUrl = null; } 
                       catch (e) { console.warn("Vídeo antigo não encontrado.", e); }
                    }
                    if (progressText) progressText.textContent = 'A carregar imagem de fundo...';
                    dataToSave.imageUrl = await uploadFile(imageFile, 'site-images', 'hero-background', onProgress);
                } 
                else if (dataToSave.backgroundType === 'video' && videoFile) {
                    if (currentHomeData.imageUrl) {
                       try { await deleteObject(ref(storage, currentHomeData.imageUrl)); dataToSave.imageUrl = null; } 
                       catch (e) { console.warn("Imagem antiga não encontrada.", e); }
                    }
                    if (progressText) progressText.textContent = 'A carregar vídeo de fundo...';
                    dataToSave.videoUrl = await uploadFile(videoFile, 'site-videos', 'hero-background', onProgress);
                }
                
                if (progressText) progressText.textContent = 'A finalizar...';
                await setDoc(doc(db, "pages", "home"), dataToSave, { merge: true });

                currentHomeData = { ...currentHomeData, ...dataToSave };
                showToast('Página inicial atualizada com sucesso!');

            } catch (error) {
                console.error("Erro ao salvar alterações:", error);
                showToast(`Erro: ${error.message}`, 'error');
            } finally {
                if(headerLogoInput) headerLogoInput.value = '';
                if(bannerLogoInput) bannerLogoInput.value = '';
                if(imageInput) imageInput.value = '';
                if(videoInput) videoInput.value = '';
                
                if(saveButton) saveButton.disabled = false;
                const saveButtonText = document.getElementById('save-hero-button-text');
                if(saveButtonText) saveButtonText.textContent = 'Salvar Alterações';
                const spinner = document.getElementById('save-hero-spinner');
                if(spinner) spinner.classList.add('hidden');
                if(progressContainer) progressContainer.classList.add('hidden');
            }
        });
    }

    homeInitialized = true;
}

