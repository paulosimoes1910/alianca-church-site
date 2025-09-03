// js/public.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadHeroContent() {
    try {
        const docRef = doc(db, "pages", "home");
        const docSnap = await getDoc(docRef);
        const homeSection = document.getElementById('home');
        if (!homeSection) return;
        if (docSnap.exists()) {
            const data = docSnap.data();
            homeSection.querySelector('h1').textContent = data.title || "Bem-vindo à nossa comunidade";
            homeSection.querySelector('p').textContent = data.subtitle || "Um lugar para crescer na fé, encontrar amigos e servir a Deus.";
            if (data.imageUrl) {
                homeSection.style.backgroundImage = `url('${data.imageUrl}')`;
            }
        } else {
            console.log("Documento 'home' não encontrado. Usando conteúdo padrão.");
        }
    } catch (error) {
        console.error("Erro ao carregar conteúdo da página inicial:", error);
    }
}

async function loadPublicPastores() {
    const container = document.getElementById('pastores-container-public');
    if (!container) return;
    try {
        const querySnapshot = await getDocs(collection(db, "pastores"));
        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-center col-span-full">Nenhuma informação de pastores encontrada.</p>';
            return;
        }
        let pastoresHtml = '';
        querySnapshot.forEach(doc => {
            const pastor = doc.data();
            pastoresHtml += `
                <div class="text-center w-64">
                    <img src="${pastor.photoURL || 'https://placehold.co/400x400/e2e8f0/334155?text=?'}" alt="Foto de ${pastor.name}" class="w-40 h-40 mx-auto rounded-full mb-4 shadow-lg object-cover">
                    <h3 class="text-xl font-bold">${pastor.name || 'Nome do Pastor'}</h3>
                    <p class="text-gray-500">${pastor.role || 'Título'}</p>
                </div>
            `;
        });
        container.innerHTML = pastoresHtml;
    } catch (error) {
        console.error("Erro ao carregar pastores: ", error);
        container.innerHTML = '<p class="text-center text-red-500 col-span-full">Ocorreu um erro ao carregar as informações.</p>';
    }
}

async function loadPublicEvents() {
    const container = document.getElementById('events-container-public');
    if (!container) return;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const q = query(
            collection(db, "eventos"),
            where("date", ">=", today),
            orderBy("date", "asc"),
            limit(3)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const eventsSection = document.getElementById('events');
            if (eventsSection) eventsSection.style.display = 'none';
            return;
        }

        let eventsHtml = '';
        querySnapshot.forEach(doc => {
            const event = doc.data();
            const eventDate = event.date.toDate();
            const formattedDate = eventDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            const formattedTime = event.time;
            const imageUrl = event.imageUrl || 'https://placehold.co/600x600/a5b4fc/ffffff?text=Evento';
            
            eventsHtml += `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
                    <img src="${imageUrl}" alt="Capa do Evento: ${event.title}" class="w-full object-cover event-card-image"> 
                    
                    <div class="p-6 flex flex-col flex-grow">
                        <h3 class="font-bold text-xl mb-4 text-gray-800">${event.title}</h3>
                        
                        <div class="space-y-2 text-gray-600 mt-auto">
                            <p class="text-sm font-semibold flex items-center gap-3">
                                <i class="far fa-calendar-alt fa-fw text-indigo-600"></i>
                                <span>${formattedDate}</span>
                            </p>
                            <p class="text-sm font-semibold flex items-center gap-3">
                                <i class="far fa-clock fa-fw text-indigo-600"></i>
                                <span>${formattedTime}</span>
                            </p>
                            <p class="text-sm font-semibold flex items-center gap-3">
                                <i class="fas fa-map-marker-alt fa-fw text-indigo-600"></i>
                                <span>${event.location}</span>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = eventsHtml;

    } catch (error) {
        console.error("Erro ao carregar eventos: ", error);
        container.innerHTML = '<p class="text-center text-red-500 col-span-full">Ocorreu um erro ao carregar os eventos.</p>';
    }
}


async function loadPublicStudies() {
    const container = document.getElementById('studies-container-public');
    if (!container) return;

    try {
        const q = query(
            collection(db, "estudos"),
            orderBy("createdAt", "desc"),
            limit(3)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const studiesSection = document.getElementById('studies');
            if (studiesSection) studiesSection.style.display = 'none';
            return;
        }

        let studiesHtml = '';
        querySnapshot.forEach(doc => {
            const study = doc.data();
            const studyUrl = study.downloadURL || '#';
            const imageUrl = study.imageUrl || 'https://placehold.co/600x400/a5b4fc/ffffff?text=Estudo';

            studiesHtml += `
                <a href="${studyUrl}" target="_blank" rel="noopener noreferrer" class="block rounded-lg shadow-lg overflow-hidden group transition-transform duration-300 hover:-translate-y-1">
                    <img src="${imageUrl}" alt="Capa do Estudo: ${study.title}" class="w-full h-48 object-cover">
                    <div class="p-4 bg-white">
                        <h3 class="font-bold text-xl text-gray-800 mb-1">${study.title}</h3>
                        <p class="text-sm text-gray-500">${study.category}</p>
                    </div>
                </a>
            `;
        });
        container.innerHTML = studiesHtml;
        
    } catch (error) {
        console.error("Erro ao carregar estudos: ", error);
        container.innerHTML = '<p class="text-center text-red-500 col-span-full">Ocorreu um erro ao carregar os estudos.</p>';
    }
}

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

async function loadPublicVideos() {
    const liveContainer = document.getElementById('live-video-container');
    const livePlayerWrapper = document.getElementById('live-video-player-wrapper');
    const recentContainer = document.getElementById('recent-videos-container');
    const recentContainerWrapper = document.getElementById('recent-videos-container-wrapper');
    const videosSection = document.getElementById('videos-section');
    const errorMessageContainer = document.getElementById('videos-error-message');

    if (!liveContainer || !recentContainer || !videosSection) return;

    try {
        const q = query(collection(db, "videos"), orderBy("position", "asc"), limit(4));
        const querySnapshot = await getDocs(q);
        
        errorMessageContainer.classList.add('hidden');

        if (querySnapshot.empty) {
            videosSection.classList.add('hidden');
            return;
        }
        
        videosSection.classList.remove('hidden');

        const videos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const liveVideo = videos.find(v => v.isLive);
        const recentVideos = videos.filter(v => !v.isLive).slice(0, 3);

        if (liveVideo) {
            liveContainer.classList.remove('hidden');
            const liveVideoId = getYouTubeId(liveVideo.youtubeUrl);
            livePlayerWrapper.innerHTML = `
                <div class="relative w-full" style="padding-top: 56.25%;">
                    <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/${liveVideoId}?autoplay=1&mute=1" 
                    title="YouTube video player" frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen></iframe>
                </div>
            `;
        } else {
            liveContainer.classList.add('hidden');
        }

        if (recentVideos.length > 0) {
            recentContainerWrapper.classList.remove('hidden');
            let recentHtml = '';
            recentVideos.forEach(video => {
                const videoId = getYouTubeId(video.youtubeUrl);
                // ▼▼▼ LINHA CORRIGIDA AQUI ▼▼▼
                recentHtml += `
                    <a href="${video.youtubeUrl}" target="_blank" class="block rounded-lg shadow-lg overflow-hidden group transition-transform duration-300 hover:-translate-y-1">
                        <img src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg" alt="Thumbnail do vídeo" class="w-full object-cover video-card-image">
                        <div class="p-4 bg-white">
                            <p class="font-semibold text-gray-800 text-sm truncate group-hover:text-indigo-600">Ver no YouTube</p>
                        </div>
                    </a>
                `;
                // ▲▲▲ FIM DA CORREÇÃO ▲▲▲
            });
            recentContainer.innerHTML = recentHtml;
        } else {
            recentContainerWrapper.classList.add('hidden');
        }

    } catch (error) {
        console.error("Erro ao carregar vídeos: ", error);
        if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
            errorMessageContainer.classList.remove('hidden');
            liveContainer.classList.add('hidden');
            recentContainerWrapper.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadHeroContent();
    loadPublicPastores();
    loadPublicEvents();
    loadPublicStudies();
    loadPublicVideos();
});

