// js/firebase-config.js
// Este ficheiro contém a configuração e inicialização do Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// A sua configuração do Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyB9YzcD6osYRoQTzCvGcPIhrGgthTbAE1s",
  authDomain: "alianca-church-site.firebaseapp.com",
  projectId: "alianca-church-site",
  storageBucket: "alianca-church-site.firebasestorage.app",
  messagingSenderId: "477371773358",
  appId: "1:477371773358:web:8276294dc879516a9a183f"
};

// Inicializa a aplicação Firebase principal
const app = initializeApp(firebaseConfig);

// Inicializa os serviços e exporta-os diretamente.
// Isto garante que eles estão sempre prontos para serem usados noutros ficheiros.
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

