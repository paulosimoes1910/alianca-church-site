// js/pages/gcs.js
// Este ficheiro gere a lógica das páginas de Cadastro de GC e Endereços/Mapa.

import { collection, addDoc, onSnapshot, query, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { navigateToPage } from '../navigation.js';
import { showNotification } from '../notifications.js';


// Variáveis de estado do módulo
let gcFormInitialized = false;
let mapInitialized = false;
let mapInstance = null;
let leaderMarkers = [];
let allMapLeaders = []; // Guarda os dados dos líderes para o modal
const apiKey = 'AIzaSyDRJa0gyIYCdS-gWCBr9gqpa9ZBDk7x9sc';

// --- Lógica do Formulário de Cadastro ---
async function initializeGCForm(gcId = null) {
    if (gcFormInitialized && !gcId) return;

    const gcRegistrationForm = document.getElementById('gc-registration-form');
    const postCodInput = document.getElementById('post_cod');
    const countryCodeSelect = document.getElementById('country_code');
    const otherCountryCodeInput = document.getElementById('other_country_code');
    const gcFormWrapper = document.getElementById('gc-form-wrapper');
    const successMessage = document.getElementById('success-message');
    const newRegistrationBtn = document.getElementById('new-registration-btn');
    
    if (postCodInput) {
        postCodInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
    }

    if (countryCodeSelect && otherCountryCodeInput) {
        countryCodeSelect.addEventListener('change', (e) => {
            otherCountryCodeInput.classList.toggle('hidden', e.target.value !== 'outros');
        });
    }

    if (gcRegistrationForm) {
        gcRegistrationForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(gcRegistrationForm);
            const data = {
                nome: formData.get('nome'),
                data_nascimento: formData.get('data_nascimento'),
                email: formData.get('email'),
                telefone: formData.get('telefone'),
                endereco: formData.get('endereco'),
                post_cod: formData.get('post_cod'),
                country_code: formData.get('country_code') === 'outros' ? formData.get('other_country_code') : formData.get('country_code'),
                memberNumber: String(Math.floor(1000 + Math.random() * 9000)),
                contacted: false,
                gc_id: gcId || null,
                quer_gc: true,
                formId: null,
                createdAt: serverTimestamp()
            };

            try {
                await addDoc(collection(db, "cadastros"), data);
                if(gcFormWrapper) gcFormWrapper.classList.add('hidden');
                if(successMessage) successMessage.classList.remove('hidden');
                gcRegistrationForm.reset();
            } catch (error) {
                console.error("Error adding document: ", error);
                showNotification('Erro', 'Ocorreu um erro ao guardar o seu registo. Tente novamente.');
            }
        };
    }

    if (newRegistrationBtn) {
        newRegistrationBtn.addEventListener('click', () => {
            if(successMessage) successMessage.classList.add('hidden');
            if(gcFormWrapper) gcFormWrapper.classList.remove('hidden');
        });
    }

    gcFormInitialized = true;
}

// --- Lógica do Mapa de Endereços ---
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function renderLeaderDistanceList(leaders) {
    const container = document.getElementById('leader-distance-list');
    const containerWrapper = document.getElementById('leader-distance-container');
    if (!container || !containerWrapper) return;

    container.innerHTML = '';
    if (leaders.length > 0) {
        containerWrapper.classList.remove('hidden');
    } else {
        containerWrapper.classList.add('hidden');
        return;
    }

    leaders.forEach(leader => {
        const card = `
            <div class="card rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="text-center sm:text-left">
                    <h4 class="font-bold primary-text">${leader.name}</h4>
                    <p class="text-sm">${leader.endereco}, ${leader.post_cod}</p>
                </div>
                <div class="flex items-center gap-4 mt-4 sm:mt-0">
                    <div class="text-right flex-shrink-0">
                        <p class="font-bold text-lg primary-text">${leader.distance.toFixed(1)} km</p>
                        <p class="text-xs">de distância</p>
                    </div>
                    <button class="view-leader-profile-btn text-sm font-semibold p-2 px-4 rounded-lg text-white whitespace-nowrap" style="background-color: var(--menu-link-color);" data-leader-id="${leader.id}">
                        Ver Perfil
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// ATUALIZADO: Nova função para inicializar o mapa de forma moderna e assíncrona
async function initMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    try {
        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        mapInstance = new Map(mapContainer, {
            zoom: 10,
            center: { lat: 51.5074, lng: -0.1278 }, // Londres
            mapId: 'ALIANCA_CHURCH_MAP_ID', // ID de mapa obrigatório para marcadores avançados
            mapTypeControl: false,
            streetViewControl: false
        });

        const q = query(collection(db, "publicProfiles"));
        onSnapshot(q, (snapshot) => {
            const lideres = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            leaderMarkers.forEach(marker => { marker.map = null; });
            leaderMarkers = [];

            const infowindow = new google.maps.InfoWindow();
            lideres.forEach(lider => {
                if (lider.lat && lider.lng) {
                    const marker = new AdvancedMarkerElement({
                        map: mapInstance,
                        position: { lat: lider.lat, lng: lider.lng },
                        title: `GC de ${lider.name}`
                    });

                    marker.addListener('gmp-click', () => {
                        let content = `<div class="p-2"><h3>GC de ${lider.name}</h3><p>${lider.endereco}, ${lider.post_cod}</p></div>`;
                        infowindow.setContent(content);
                        infowindow.open(mapInstance, marker);
                    });
                    leaderMarkers.push(marker);
                }
            });
        });

    } catch (error) {
        console.error("Error loading Google Maps:", error);
        mapContainer.innerHTML = '<p class="text-red-500 p-4">Não foi possível carregar o Google Maps.</p>';
    }
}


function openLeaderProfileModal(leaderId) {
    const leaderData = allMapLeaders.find(l => l.id === leaderId);
    if (!leaderData) {
        console.error("Dados do líder não encontrados para o ID:", leaderId);
        return;
    }

    const modal = document.getElementById('leader-profile-modal');
    const overlay = document.getElementById('leader-profile-modal-overlay');
    const contentEl = document.getElementById('leader-profile-content');
    if (!modal || !overlay || !contentEl) return;

    const subscribeButton = `
        <div class="mt-6 w-full">
            <button id="subscribe-to-gc-btn" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition" style="background-color: var(--menu-link-color);">
                Inscrever-se neste GC
            </button>
        </div>
    `;

    contentEl.innerHTML = `
        <div class="flex flex-col items-center text-center">
            <h3 class="text-xl font-bold primary-text">${leaderData.name}</h3>
            <p class="text-sm capitalize">${leaderData.role || 'Líder'}</p>
        </div>
        <div class="border-t border-dashed pt-4 mt-4 space-y-2 text-sm">
            <p><strong>Email:</strong> <a href="mailto:${leaderData.email}" class="hover:underline">${leaderData.email}</a></p>
            <p><strong>Telefone:</strong> ${leaderData.telefone || 'N/A'}</p>
            <p><strong>Endereço:</strong> ${leaderData.endereco || 'N/A'}, ${leaderData.post_cod || 'N/A'}</p>
        </div>
        ${subscribeButton}
    `;

    document.getElementById('subscribe-to-gc-btn').onclick = () => {
        closeLeaderProfileModal();
        navigateToPage('gcs-cadastro', { gcId: leaderData.gc_id });
    };

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeLeaderProfileModal() {
    const modal = document.getElementById('leader-profile-modal');
    const overlay = document.getElementById('leader-profile-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function initializeEnderecosGC() {
    if (!mapInitialized) {
        // Carrega o script do Google Maps se ainda não tiver sido carregado
        if (!window.google || !window.google.maps) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
            script.async = true;
            document.head.appendChild(script);
            script.onload = () => {
                initMap();
            };
        } else {
           initMap();
        }
        mapInitialized = true;
    }

    const showLocationBtn = document.getElementById('show-location-btn');
    const mapStatusMessage = document.getElementById('map-status-message');
    const leaderListContainer = document.getElementById('leader-distance-list');

    if (leaderListContainer) {
        leaderListContainer.addEventListener('click', (e) => {
            const profileBtn = e.target.closest('.view-leader-profile-btn');
            if (profileBtn) {
                openLeaderProfileModal(profileBtn.dataset.leaderId);
            }
        });
    }
    const closeBtn = document.getElementById('close-leader-profile-modal');
    const overlay = document.getElementById('leader-profile-modal-overlay');
    if (closeBtn) closeBtn.addEventListener('click', closeLeaderProfileModal);
    if (overlay) overlay.addEventListener('click', closeLeaderProfileModal);


    if (showLocationBtn) {
        showLocationBtn.addEventListener('click', async () => {
            if (!navigator.geolocation) {
                mapStatusMessage.textContent = "A geolocalização não é suportada pelo seu navegador.";
                return;
            }

            mapStatusMessage.textContent = "A obter a sua localização...";
            
            const q = query(collection(db, "publicProfiles"));
            const lideresSnapshot = await getDocs(q);
            allMapLeaders = lideresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    
                    mapStatusMessage.textContent = "";

                    const leadersWithDistance = allMapLeaders
                        .filter(lider => lider.lat && lider.lng)
                        .map(leader => ({
                            ...leader,
                            distance: calculateDistance(userLocation.lat, userLocation.lng, leader.lat, leader.lng)
                        })).sort((a, b) => a.distance - b.distance);

                    renderLeaderDistanceList(leadersWithDistance);
                    
                    if (!mapInstance) {
                        await initMap();
                    }
                    
                    // ATUALIZADO: Usa AdvancedMarkerElement para a localização do utilizador
                    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
                    const userMarkerPin = document.createElement('div');
                    userMarkerPin.className = 'w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md';

                    new AdvancedMarkerElement({
                        position: userLocation,
                        map: mapInstance,
                        title: "Você está aqui!",
                        content: userMarkerPin
                    });

                    mapInstance.setCenter(userLocation);
                    mapInstance.setZoom(12);
                },
                () => {
                    mapStatusMessage.textContent = "Não foi possível obter a sua localização. Por favor, permita o acesso no seu navegador.";
                }
            );
        });
    }
}

// --- Funções de Inicialização Exportadas ---
export function initializeGcCadastroPage(params) { 
    initializeGCForm(params ? params.gcId : null); 
}

export function initializeGcEnderecosPage() { initializeEnderecosGC(); }

