import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, auth, firebaseConfig } from './firebase-config.js';
import { showNotification } from './notifications.js';

let currentUserRole = 'publico';
let currentUserName = null;
let currentUserGCId = null;

export const getCurrentUserRole = () => currentUserRole;
export const getCurrentUserName = () => currentUserName;
export const getCurrentUserGCId = () => currentUserGCId;

// ▼▼▼ FUNÇÃO RESTAURADA ▼▼▼
// Esta função é usada para criar uma conta de membro a partir de um formulário de inscrição.
export async function createMemberAccountFromSubmission(submissionData) {
    const email = submissionData.formData['Email'] || submissionData.formData['email'];
    const name = submissionData.formData['Nome Completo'] || submissionData.formData['nome'];
    const telefone = submissionData.formData['Telefone'] || submissionData.formData['telefone'];
    const endereco = submissionData.formData['Endereço'] || submissionData.formData['endereco'];
    const postCod = submissionData.formData['Post Cod'] || submissionData.formData['post_cod'];

    if (!email || !name) {
        throw new Error("O formulário de inscrição não contém um Nome ou Email válido.");
    }

    const tempPassword = `membro${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Usa uma instância secundária da app para não interferir com o login principal
    const secondaryApp = initializeApp(firebaseConfig, `secondary-app-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        role: 'membro', // Define o papel como 'membro' por defeito
        uid: user.uid,
        telefone: telefone || 'N/A',
        endereco: endereco || 'N/A',
        post_cod: postCod || 'N/A'
    });

    return tempPassword; // Retorna a password temporária para que possa ser mostrada ao admin
}
// ▲▲▲ FIM DA FUNÇÃO RESTAURADA ▲▲▲

function updateUIForUser(name, isLoggedIn) {
    const authButton = document.getElementById('auth-button');
    if (!authButton) return;

    if (isLoggedIn) {
        authButton.textContent = 'Logout';
    } else {
        authButton.textContent = 'Login';
    }
}

function updateSideMenuForRole(role) {
    const isPublic = role === 'publico';
    const isAdmin = role === 'admin';
    const isLeader = role === 'lider' || role === 'admin';

    // Lista de páginas públicas que devem estar sempre visíveis
    const publicPages = [
        'pastores',
        'estudos',
        'eventos',
        'videos',
        'biblia',
        'gcs-cadastro',
        'gcs-lideres',
        'gcs-enderecos'
    ];

    // Oculta todos os links do menu principal e submenus para começar
    document.querySelectorAll('#main-nav a, #main-nav div[class*="text-xs"], #main-nav .submenu-trigger').forEach(el => {
        el.style.display = 'none';
    });


    if (isPublic) {
        // Mostra apenas os links e cabeçalhos de secção relevantes para o público
        document.querySelector('.menu-link[data-page="inicio"]').style.display = 'flex'; // Dashboard/Início
        
        document.querySelectorAll('.px-3.pt-4.pb-2').forEach(header => {
            const headerText = header.textContent.toLowerCase();
            if (headerText.includes('página pública') || headerText.includes('grupos de crescimento') || headerText.includes('ferramentas')) {
                header.style.display = 'block';
            }
        });
        
        publicPages.forEach(pageId => {
            const link = document.querySelector(`.menu-link[data-page="${pageId}"]`);
            if (link) {
                link.style.display = 'flex';
            }
        });

        // Mostra o gatilho do submenu de GCs (CORRIGIDO)
        const allSubmenuTriggers = document.querySelectorAll('.submenu-trigger');
        allSubmenuTriggers.forEach(trigger => {
            const span = trigger.querySelector('span');
            if (span && span.textContent.includes('GCs')) {
                trigger.style.display = 'flex';
            }
        });

        // Mostra o Gerador QR Code
        const qrCodeLink = document.querySelector('.menu-link[data-page="qrcode"]');
        if(qrCodeLink) qrCodeLink.style.display = 'flex';


    } else {
         // Se estiver logado (líder ou admin), mostra tudo o que não for específico de outro role
         document.querySelectorAll('#main-nav a, #main-nav div[class*="text-xs"], #main-nav .submenu-trigger').forEach(el => {
            const isFlex = el.tagName === 'A' || el.classList.contains('submenu-trigger');
            el.style.display = isFlex ? 'flex' : 'block';
        });
    }

    // Controla a visibilidade dos itens de Administrador
    document.querySelectorAll('[data-admin-only]').forEach(el => {
        const isFlex = el.tagName === 'A' || el.tagName === 'BUTTON' || el.classList.contains('submenu-trigger');
        if (!isAdmin) el.style.display = 'none';
    });

    // Controla a visibilidade dos itens de Líder
    document.querySelectorAll('[data-leader-only]').forEach(el => {
        const isFlex = el.tagName === 'A' || el.tagName === 'BUTTON';
         if (!isLeader) el.style.display = 'none';
    });
}


function showAuthModal(show) {
    const authModal = document.getElementById('auth-modal');
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    if (authModal && authModalOverlay) {
        authModal.classList.toggle('hidden', !show);
        authModalOverlay.classList.toggle('hidden', !show);
    }
}

export function initializeAuth(onRoleChangeCallback) {
    if (!auth) {
        console.error("Módulo de Autenticação do Firebase não foi inicializado.");
        return;
    }

    setPersistence(auth, browserLocalPersistence).then(() => {
        const authButton = document.getElementById('auth-button');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        authButton?.addEventListener('click', () => {
            if (auth.currentUser) {
                signOut(auth).then(() => {
                    window.location.href = 'index.html';
                });
            } else {
                showAuthModal(true);
            }
        });

        document.getElementById('close-auth-modal')?.addEventListener('click', () => showAuthModal(false));
        document.getElementById('auth-modal-overlay')?.addEventListener('click', () => showAuthModal(false));

        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const isLogin = tab.dataset.tab === 'login';
                document.getElementById('login-tab-content').classList.toggle('hidden', !isLogin);
                document.getElementById('register-tab-content').classList.toggle('hidden', isLogin);
                document.getElementById('login-error-message').classList.add('hidden');
                document.getElementById('register-error-message').classList.add('hidden');
            });
        });

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            const errorMessage = document.getElementById('login-error-message');
            errorMessage.textContent = "";
            errorMessage.classList.add('hidden');
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                errorMessage.textContent = "Email ou palavra-passe incorretos.";
                errorMessage.classList.remove('hidden');
            }
        });
        
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = registerForm['register-name'].value;
            const email = registerForm['register-email'].value;
            const password = registerForm['register-password'].value;
            const errorMessage = document.getElementById('register-error-message');
            errorMessage.textContent = "";
            errorMessage.classList.add('hidden');
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    name: name,
                    email: email,
                    role: 'pendente',
                    uid: userCredential.user.uid,
                });
                showAuthModal(false);
                showNotification("Conta Criada!", "A sua conta foi criada e aguarda aprovação de um administrador.");
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage.textContent = "Este e-mail já está a ser utilizado.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage.textContent = "A senha deve ter pelo menos 6 caracteres.";
                } else {
                    errorMessage.textContent = "Ocorreu um erro ao criar a conta.";
                }
                errorMessage.classList.remove('hidden');
            }
        });

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    currentUserRole = userData.role;
                    currentUserName = userData.name;
                    currentUserGCId = userData.gc_id || null;
                    updateUIForUser(currentUserName, true);
                    showAuthModal(false);
                } else {
                    signOut(auth);
                    return;
                }
            } else {
                currentUserRole = 'publico';
                currentUserName = null;
                currentUserGCId = null;
                updateUIForUser(null, false);
                showAuthModal(false);
            }

            updateSideMenuForRole(currentUserRole);
            if (onRoleChangeCallback) {
                onRoleChangeCallback(currentUserRole);
            }
        });
    });
}

