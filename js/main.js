// Importações de Configuração e Utilitários
import { app, auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setupNavigation, showPage } from './navigation.js';
import { setupTheme } from './ui.js';
import { showToast } from './notifications.js';

// Importações dos Módulos de Página (CAMINHOS CORRIGIDOS)
import { initDashboard } from './dashboard.js';
import { initPastores } from './pastores.js';
import { initEstudos } from './estudos.js';
import { initEventos } from './eventos.js';
import { initVideos } from './videos.js';
import { initBiblia } from './bible.js';
import { initGCsCadastro, initLideresGC, initMapaGCs } from './gcs.js';
import { initMeuGC, initNovosCadastros } from './leader.js';
import { initGerirContas, initGerirLideres, initRelatorioGeral, initGerirFormularios, initVerInscritos } from './admin.js';
import { initQRCodeGenerator } from './qrcode.js';
import { initHomeEditor } from './home.js';

document.addEventListener('DOMContentLoaded', async () => {
    setupTheme();
    setupNavigation();

    // Aguarda a verificação do estado de autenticação
    onAuthStateChanged(auth, async (user) => {
        const authButton = document.getElementById('auth-button');

        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const userRole = userData.role;

                    console.log(`Auth state changed. User role is now: ${userRole}`);

                    // Atualiza o botão de autenticação para "Logout"
                    authButton.textContent = 'Logout';
                    authButton.onclick = () => signOut(auth).catch(error => console.error("Logout error", error));

                    // Esconde/mostra elementos do menu com base no papel (role)
                    document.querySelectorAll('[data-admin-only]').forEach(el => el.style.display = userRole === 'admin' ? '' : 'none');
                    document.querySelectorAll('[data-leader-only]').forEach(el => el.style.display = (userRole === 'admin' || userRole === 'lider') ? '' : 'none');

                    // Inicializa todos os módulos
                    console.log("A inicializar o painel de administração...");
                    initDashboard(db);
                    initHomeEditor(db);
                    initPastores(db);
                    console.log("A inicializar o listener dos estudos...");
                    initEstudos(db, auth);
                    initEventos(db, auth);
                    initVideos(db, auth);
                    initBiblia();
                    initGCsCadastro(db);
                    initLideresGC(db);
                    initMapaGCs(db);
                    initQRCodeGenerator();

                    if (userRole === 'admin' || userRole === 'lider') {
                        initMeuGC(db, auth);
                        initNovosCadastros(db, auth);
                    }

                    if (userRole === 'admin') {
                        initGerirContas(db);
                        initGerirLideres(db);
                        initRelatorioGeral(db, auth);
                        initGerirFormularios(db, (formId, formTitle) => {
                            initVerInscritos(db, formId, formTitle);
                            showPage('admin-ver-inscritos');
                        });
                    }

                    const pageId = window.location.hash.substring(1) || 'inicio';
                    showPage(pageId, true);

                } else {
                    console.error("User document not found in Firestore.");
                    showToast("Erro: Os seus dados não foram encontrados.", 'error');
                    signOut(auth);
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                showToast("Erro ao verificar as suas permissões.", 'error');
                signOut(auth);
            }
        } else {
            console.log("Nenhum utilizador autenticado, a redirecionar para a página inicial.");
            window.location.href = 'index.html';
        }
    });
});


