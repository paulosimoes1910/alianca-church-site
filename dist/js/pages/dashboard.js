// js/pages/dashboard.js
// Versão melhorada com mais estatísticas e listas de ações rápidas.

import { collection, query, where, getDocs, Timestamp, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from '../firebase-config.js';
import { navigateToPage } from "../navigation.js"; // <-- ADICIONADO: Importar a função de navegação

// Função para formatar a data atual
function setCurrentDate() {
    const dateEl = document.getElementById('current-date');
    if (!dateEl) return;
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('pt-BR', options);
}

// Função para buscar e exibir as estatísticas melhoradas
async function fetchDashboardStats() {
    // Seletores para os cartões de estatísticas
    const newSignupsEl = document.getElementById('new-signups-stat');
    const nextEventTitleEl = document.getElementById('next-event-title');
    const nextEventStatEl = document.getElementById('next-event-stat');
    const totalMembersEl = document.getElementById('total-members-stat');
    const pendingAccountsEl = document.getElementById('pending-accounts-stat');
    const totalStudiesEl = document.getElementById('total-studies-stat');
    const totalGCsEl = document.getElementById('total-gcs-stat');
    const latestSignupsContainer = document.getElementById('latest-signups-container');

    // 1. Novos Cadastros (últimos 7 dias)
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

        const signupsQuery = query(
            collection(db, "cadastros"), 
            where("createdAt", ">=", sevenDaysAgoTimestamp)
        );
        const signupsSnapshot = await getDocs(signupsQuery);
        if (newSignupsEl) newSignupsEl.textContent = signupsSnapshot.size;
    } catch (error) {
        console.error("Erro ao buscar novos cadastros:", error);
        if (newSignupsEl) newSignupsEl.textContent = 'Erro';
    }

    // 2. Próximo Evento
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const eventsQuery = query(
            collection(db, "eventos"),
            where("date", ">=", todayTimestamp),
            orderBy("date", "asc"),
            limit(1)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        if (!eventsSnapshot.empty) {
            const nextEvent = eventsSnapshot.docs[0].data();
            const eventDate = nextEvent.date.toDate();
            
            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (nextEventTitleEl) nextEventTitleEl.textContent = `Próximo Evento: ${nextEvent.title}`;
            if (nextEventStatEl) {
                if (diffDays === 0) nextEventStatEl.textContent = 'É Hoje!';
                else if (diffDays === 1) nextEventStatEl.textContent = 'É Amanhã!';
                else nextEventStatEl.textContent = `Em ${diffDays} dias`;
            }
        } else {
            if (nextEventTitleEl) nextEventTitleEl.textContent = 'Próximo Evento';
            if (nextEventStatEl) nextEventStatEl.textContent = 'Nenhum agendado';
        }
    } catch (error) {
        console.error("Erro ao buscar próximo evento:", error);
        if (nextEventStatEl) nextEventStatEl.textContent = 'Erro';
    }

    // 3. Total de Membros (Cadastros)
    try {
        const membersSnapshot = await getDocs(collection(db, "cadastros"));
        if (totalMembersEl) totalMembersEl.textContent = membersSnapshot.size;
    } catch (error) {
        console.error("Erro ao buscar total de membros:", error);
        if (totalMembersEl) totalMembersEl.textContent = 'Erro';
    }

    // 4. Contas de Utilizador Pendentes
    try {
        const pendingQuery = query(collection(db, "users"), where("role", "==", "pendente"));
        const pendingSnapshot = await getDocs(pendingQuery);
        if (pendingAccountsEl) pendingAccountsEl.textContent = pendingSnapshot.size;
    } catch (error) {
        console.error("Erro ao buscar contas pendentes:", error);
        if (pendingAccountsEl) pendingAccountsEl.textContent = 'Erro';
    }
    
    // 5. Total de Estudos
     try {
        const studiesSnapshot = await getDocs(collection(db, "estudos"));
        if (totalStudiesEl) totalStudiesEl.textContent = studiesSnapshot.size;
    } catch (error) {
        console.error("Erro ao buscar total de estudos:", error);
        if (totalStudiesEl) totalStudiesEl.textContent = 'Erro';
    }
    
    // 6. Total de GCs (Líderes)
     try {
        const gcsQuery = query(collection(db, "users"), where("role", "==", "lider"));
        const gcsSnapshot = await getDocs(gcsQuery);
        if (totalGCsEl) totalGCsEl.textContent = gcsSnapshot.size;
    } catch (error) {
        console.error("Erro ao buscar total de GCs:", error);
        if (totalGCsEl) totalGCsEl.textContent = 'Erro';
    }

    // 7. Lista de Últimos Cadastros por Contactar
    try {
        const latestSignupsQuery = query(
            collection(db, "cadastros"), 
            where("contacted", "==", false),
            orderBy("createdAt", "desc"),
            limit(5)
        );
        const latestSignupsSnapshot = await getDocs(latestSignupsQuery);
        if (latestSignupsContainer) {
            if (latestSignupsSnapshot.empty) {
                latestSignupsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Não há cadastros pendentes de contacto.</p>';
            } else {
                let html = '';
                latestSignupsSnapshot.forEach(doc => {
                    const signup = doc.data();
                    const date = signup.createdAt?.toDate().toLocaleDateString('pt-BR') || 'Data incerta';
                    html += `
                        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                            <div>
                                <p class="font-semibold text-gray-800">${signup.nome}</p>
                                <p class="text-xs text-gray-500">${date}</p>
                            </div>
                            <a href="#admin-relatorio-geral" data-page="admin-relatorio-geral" class="quick-link text-sm font-medium text-indigo-600 hover:underline">Ver</a>
                        </div>
                    `;
                });
                latestSignupsContainer.innerHTML = html;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar últimos cadastros:", error);
        if (latestSignupsContainer) latestSignupsContainer.innerHTML = '<p class="text-red-500 text-center py-4">Erro ao carregar cadastros.</p>';
    }
}


// Função de inicialização da página
export function initializeDashboardPage() {
    const inicioPage = document.getElementById('inicio');
    if (!inicioPage) return;

    // Adiciona o HTML do novo dashboard à página 'inicio'
    inicioPage.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
                <h2 class="text-3xl font-bold primary-text">Dashboard</h2>
                <p class="text-gray-600">Resumo da atividade da sua igreja.</p>
            </div>
            <div class="text-sm text-gray-500 mt-2 sm:mt-0">
                <span id="current-date"></span>
            </div>
        </div>

        <!-- STATS CARDS -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <a href="#admin-relatorio-geral" data-page="admin-relatorio-geral" class="quick-link bg-white p-6 rounded-lg shadow-md flex items-center hover:shadow-xl transition-shadow">
                <div class="bg-blue-100 text-blue-600 p-4 rounded-full"><i class="fas fa-user-plus fa-2x"></i></div>
                <div class="ml-4">
                    <p class="text-gray-500 text-sm">Novos Cadastros (7d)</p>
                    <p id="new-signups-stat" class="text-2xl font-bold">0</p>
                </div>
            </a>
            <a href="#eventos" data-page="eventos" class="quick-link bg-white p-6 rounded-lg shadow-md flex items-center hover:shadow-xl transition-shadow">
                <div class="bg-green-100 text-green-600 p-4 rounded-full"><i class="fas fa-calendar-check fa-2x"></i></div>
                <div class="ml-4">
                    <p id="next-event-title" class="text-gray-500 text-sm truncate">Próximo Evento</p>
                    <p id="next-event-stat" class="text-xl font-bold">A carregar...</p>
                </div>
            </a>
            <a href="#admin-gerir-lideres" data-page="admin-gerir-lideres" class="quick-link bg-white p-6 rounded-lg shadow-md flex items-center hover:shadow-xl transition-shadow">
                <div class="bg-red-100 text-red-600 p-4 rounded-full"><i class="fas fa-users fa-2x"></i></div>
                <div class="ml-4">
                    <p class="text-gray-500 text-sm">Total de GCs</p>
                    <p id="total-gcs-stat" class="text-2xl font-bold">0</p>
                </div>
            </a>
             <a href="#admin-gerir-contas" data-page="admin-gerir-contas" class="quick-link bg-white p-6 rounded-lg shadow-md flex items-center hover:shadow-xl transition-shadow">
                <div class="bg-yellow-100 text-yellow-600 p-4 rounded-full"><i class="fas fa-user-clock fa-2x"></i></div>
                <div class="ml-4">
                    <p class="text-gray-500 text-sm">Contas Pendentes</p>
                    <p id="pending-accounts-stat" class="text-2xl font-bold">0</p>
                </div>
            </a>
            <a href="#admin-relatorio-geral" data-page="admin-relatorio-geral" class="quick-link bg-white p-6 rounded-lg shadow-md flex items-center hover:shadow-xl transition-shadow">
                <div class="bg-indigo-100 text-indigo-600 p-4 rounded-full"><i class="fas fa-user-friends fa-2x"></i></div>
                <div class="ml-4">
                    <p class="text-gray-500 text-sm">Total de Membros</p>
                    <p id="total-members-stat" class="text-2xl font-bold">0</p>
                </div>
            </a>
             <a href="#estudos" data-page="estudos" class="quick-link bg-white p-6 rounded-lg shadow-md flex items-center hover:shadow-xl transition-shadow">
                <div class="bg-teal-100 text-teal-600 p-4 rounded-full"><i class="fas fa-book-open fa-2x"></i></div>
                <div class="ml-4">
                    <p class="text-gray-500 text-sm">Estudos Publicados</p>
                    <p id="total-studies-stat" class="text-2xl font-bold">0</p>
                </div>
            </a>
        </div>
        
        <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2">
                <h3 class="text-xl font-bold text-gray-700 mb-4">Acesso Rápido</h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4" id="quick-links-container">
                    <a href="#pastores" data-page="pastores" class="quick-link bg-white p-4 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow flex flex-col items-center justify-center">
                        <i class="fas fa-user-tie fa-2x text-indigo-500 mb-2"></i>
                        <p class="font-semibold">Gerir Pastores</p>
                    </a>
                    <a href="#estudos" data-page="estudos" class="quick-link bg-white p-4 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow flex flex-col items-center justify-center">
                        <i class="fas fa-graduation-cap fa-2x text-indigo-500 mb-2"></i>
                        <p class="font-semibold">Gerir Estudos</p>
                    </a>
                    <a href="#eventos" data-page="eventos" class="quick-link bg-white p-4 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow flex flex-col items-center justify-center">
                        <i class="fas fa-calendar-alt fa-2x text-indigo-500 mb-2"></i>
                        <p class="font-semibold">Gerir Eventos</p>
                    </a>
                     <a href="#editar-inicio" data-page="editar-inicio" class="quick-link bg-white p-4 rounded-lg shadow-md text-center hover:shadow-xl transition-shadow flex flex-col items-center justify-center">
                        <i class="fas fa-edit fa-2x text-indigo-500 mb-2"></i>
                        <p class="font-semibold">Página Inicial</p>
                    </a>
                </div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                 <h3 class="text-xl font-bold text-gray-700 mb-4">Últimos Cadastros por Contactar</h3>
                 <div id="latest-signups-container" class="space-y-2">
                    <p class="text-gray-500 text-center py-4">A carregar...</p>
                 </div>
            </div>
        </div>
    `;

    setCurrentDate();
    fetchDashboardStats();

    // ADICIONADO: Adiciona os listeners de clique aos links de navegação do dashboard
    const dashboardLinks = inicioPage.querySelectorAll('.quick-link');
    dashboardLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.currentTarget.dataset.page;
            if (pageId) {
                navigateToPage(pageId);
            }
        });
    });
}

