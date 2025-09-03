// js/pages/bible.js
// Este ficheiro gere toda a lógica da página da Bíblia com o novo design de modal.

const BIBLE_URLS = {
    acf: 'https://raw.githubusercontent.com/paulosimoes1910/biblia-dados/main/acf.json',
    nvi: 'https://raw.githubusercontent.com/paulosimoes1910/biblia-dados/main/nvi.json',
    aa: 'https://raw.githubusercontent.com/paulosimoes1910/biblia-dados/main/aa.json'
};

let bibleData = [];
let bibleInitialized = false;
let currentVersion = localStorage.getItem('bibleVersion') || 'nvi';
let currentBookIndex = null;
let currentChapter = null;

// --- Funções de Modal ---

function openBookSelectionModal() {
    const modal = document.getElementById('book-selection-modal');
    const overlay = document.getElementById('book-selection-modal-overlay');
    if (!modal || !overlay) return;
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    renderBookList(); // Renderiza a lista de livros ao abrir
}

function closeBookSelectionModal() {
    const modal = document.getElementById('book-selection-modal');
    const overlay = document.getElementById('book-selection-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function openChapterModal(bookIndex) {
    currentBookIndex = bookIndex;
    const book = bibleData[bookIndex];
    const container = document.getElementById('chapter-list-container');
    const modal = document.getElementById('chapter-modal');
    const overlay = document.getElementById('chapter-modal-overlay');

    if (!book || !container || !modal || !overlay) return;

    document.getElementById('chapter-modal-title').textContent = book.name;
    container.innerHTML = '';
    for (let i = 1; i <= book.chapters.length; i++) {
        const btn = `<button class="chapter-item flex items-center justify-center h-12 w-12 rounded-lg card hover:bg-gray-100 dark:hover:bg-gray-700" data-chapter="${i}">${i}</button>`;
        container.innerHTML += btn;
    }

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeChapterModal() {
    const modal = document.getElementById('chapter-modal');
    const overlay = document.getElementById('chapter-modal-overlay');
    if(modal) modal.classList.add('hidden');
    if(overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// --- Funções de Renderização e UI ---

function renderBookList(filter = '') {
    const container = document.getElementById('book-list-container');
    if (!container) return;
    const normalizedFilter = filter.toLowerCase();
    const filteredBooks = bibleData.filter(book => book.name.toLowerCase().includes(normalizedFilter));
    
    container.innerHTML = filteredBooks.map((book) => {
        const originalIndex = bibleData.findIndex(b => b.name === book.name);
        return `<button class="book-item w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" data-book-index="${originalIndex}">${book.name}</button>`;
    }).join('');
}

// ▼▼▼ FUNÇÃO ATUALIZADA ▼▼▼
function renderChapterText() {
    const book = bibleData[currentBookIndex];
    if (!book) return;
    const chapterText = book.chapters[currentChapter - 1];
    
    document.getElementById('bible-location').textContent = `${book.name} ${currentChapter}`;
    
    // Seleciona o container específico para os versículos
    const versesContainer = document.getElementById('bible-verses-container');
    if (!versesContainer) return;

    // Esconde a mensagem de boas-vindas e limpa o conteúdo anterior
    document.getElementById('bible-welcome-message').classList.add('hidden');
    versesContainer.innerHTML = chapterText.map((verse, index) => 
        `<p><strong class="primary-text pr-2">${index + 1}</strong>${verse}</p>`
    ).join('');
    
    // Ativa/Desativa botões de navegação
    document.getElementById('prev-chapter-btn').disabled = currentChapter <= 1;
    document.getElementById('next-chapter-btn').disabled = currentChapter >= book.chapters.length;

    window.scrollTo(0, 0);
}
// ▲▲▲ FIM DA ATUALIZAÇÃO ▲▲▲

// --- Lógica Principal ---

async function loadBibleData(version) {
    const container = document.getElementById('book-list-container');
    if(container) container.innerHTML = '<p class="text-center p-4">A carregar livros...</p>';
    try {
        const response = await fetch(BIBLE_URLS[version]);
        bibleData = await response.json();
        renderBookList();
    } catch (error) {
        console.error("Bible loading error:", error);
        if(container) container.innerHTML = '<p class="text-center text-red-500 p-4">Erro ao carregar a Bíblia.</p>';
    }
}

export function initializeBiblePage() {
    if (bibleInitialized) return;

    // Elementos da UI
    const openModalBtn = document.getElementById('open-book-selection-modal-btn');
    const closeModalBtn = document.getElementById('close-book-selection-modal');
    const modalOverlay = document.getElementById('book-selection-modal-overlay');
    const searchInput = document.getElementById('book-search-input');
    const versionBtn = document.getElementById('version-selector-btn');
    const versionModal = document.getElementById('version-selection-modal');
    const bookListContainer = document.getElementById('book-list-container');
    const chapterListContainer = document.getElementById('chapter-list-container');
    const closeChapterModalBtn = document.getElementById('close-chapter-modal');
    const chapterModalOverlay = document.getElementById('chapter-modal-overlay');
    const prevChapterBtn = document.getElementById('prev-chapter-btn');
    const nextChapterBtn = document.getElementById('next-chapter-btn');

    // Carrega dados iniciais
    loadBibleData(currentVersion);
    document.getElementById('current-version-text').textContent = currentVersion.toUpperCase();

    // Listeners para o Modal de Seleção de Livros
    if(openModalBtn) openModalBtn.addEventListener('click', openBookSelectionModal);
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeBookSelectionModal);
    if(modalOverlay) modalOverlay.addEventListener('click', closeBookSelectionModal);
    if(searchInput) searchInput.addEventListener('input', (e) => renderBookList(e.target.value));

    // Listeners para a seleção de versão
    if(versionBtn) versionBtn.addEventListener('click', () => versionModal.classList.toggle('hidden'));
    document.querySelectorAll('.version-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            currentVersion = e.target.dataset.version;
            localStorage.setItem('bibleVersion', currentVersion);
            document.getElementById('current-version-text').textContent = currentVersion.toUpperCase();
            versionModal.classList.add('hidden');
            loadBibleData(currentVersion);
        });
    });

    // Listener para clicar num livro
    if(bookListContainer) bookListContainer.addEventListener('click', (e) => {
        const bookButton = e.target.closest('.book-item');
        if (bookButton) {
            closeBookSelectionModal();
            openChapterModal(parseInt(bookButton.dataset.bookIndex));
        }
    });

    // Listeners para o Modal de Seleção de Capítulos
    if(chapterListContainer) chapterListContainer.addEventListener('click', (e) => {
        const chapterButton = e.target.closest('.chapter-item');
        if (chapterButton) {
            currentChapter = parseInt(chapterButton.dataset.chapter);
            closeChapterModal();
            renderChapterText();
        }
    });
    if(closeChapterModalBtn) closeChapterModalBtn.addEventListener('click', closeChapterModal);
    if(chapterModalOverlay) chapterModalOverlay.addEventListener('click', closeChapterModal);
    
    // Listeners para navegação de capítulos
    if(prevChapterBtn) prevChapterBtn.addEventListener('click', () => {
        if (currentChapter > 1) {
            currentChapter--;
            renderChapterText();
        }
    });

    if(nextChapterBtn) nextChapterBtn.addEventListener('click', () => {
        const book = bibleData[currentBookIndex];
        if (book && currentChapter < book.chapters.length) {
            currentChapter++;
            renderChapterText();
        }
    });

    bibleInitialized = true;
}

