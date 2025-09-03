// js/pages/qrcode.js
// Este ficheiro gere a lógica do gerador de QR Code.

// Variável de estado para garantir que os listeners são adicionados apenas uma vez.
let qrCodeInitialized = false;

/**
 * Gera o QR Code com base no texto e nas opções selecionadas.
 */
function generateQRCode() {
    const qrTextInput = document.getElementById('qr-text');
    const qrcodeDiv = document.getElementById('qrcode-display');
    const messageDiv = document.getElementById('qr-message');
    const downloadBtn = document.getElementById('download-qr-btn');
    const logoInput = document.getElementById('qr-logo');

    const data = qrTextInput.value;
    if (!data) {
        if(messageDiv) {
            messageDiv.textContent = 'Por favor, digite algum texto ou URL.';
            messageDiv.classList.remove('hidden');
        }
        if(qrcodeDiv) qrcodeDiv.innerHTML = '';
        if(downloadBtn) downloadBtn.classList.add('hidden');
        return;
    }

    if(messageDiv) messageDiv.classList.add('hidden');
    if(qrcodeDiv) qrcodeDiv.innerHTML = '';
    
    // A biblioteca QRCode.js é carregada via tag <script> no index.html
    new QRCode(qrcodeDiv, {
        text: data,
        width: 1024, // Gera em alta resolução para um download de boa qualidade
        height: 1024,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H // Alta correção de erros, bom para usar com logo
    });

    // Adiciona um pequeno atraso para garantir que o canvas foi renderizado antes de adicionar o logo
    setTimeout(() => {
        if (logoInput.files && logoInput.files[0]) {
            addLogoToQRCode(logoInput.files[0]);
        } else {
            if(downloadBtn) downloadBtn.classList.remove('hidden');
        }
    }, 100);
}

/**
 * Adiciona uma imagem (logo) ao centro do QR Code gerado.
 * @param {File} logoFile - O ficheiro da imagem a ser adicionado.
 */
function addLogoToQRCode(logoFile) {
    const qrcodeDiv = document.getElementById('qrcode-display');
    const downloadBtn = document.getElementById('download-qr-btn');
    const logoSizeInput = document.getElementById('qr-logo-size');
    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const logo = new Image();
    
    const reader = new FileReader();
    reader.onload = function(event) {
        logo.src = event.target.result;
        logo.onload = () => {
            const qrSize = canvas.width;
            const logoSize = qrSize * (logoSizeInput.value / 100); 
            const center = (qrSize - logoSize) / 2;

            // Desenha o logo no centro do canvas
            ctx.drawImage(logo, center, center, logoSize, logoSize);
            
            if(downloadBtn) downloadBtn.classList.remove('hidden');
        };
    };
    reader.readAsDataURL(logoFile);
}

/**
 * Inicia o download do QR Code como uma imagem PNG.
 */
function downloadQRCode() {
    const qrcodeDiv = document.getElementById('qrcode-display');
    const messageDiv = document.getElementById('qr-message');
    const qrCanvas = qrcodeDiv.querySelector('canvas');

    if (!qrCanvas) {
        if(messageDiv) {
            messageDiv.textContent = 'Por favor, gere um QR Code antes de tentar baixar.';
            messageDiv.classList.remove('hidden');
        }
        return;
    }

    // Cria um novo canvas com uma borda branca para melhor visualização
    const borderWidth = 50;
    const borderedCanvas = document.createElement('canvas');
    borderedCanvas.width = qrCanvas.width + borderWidth * 2;
    borderedCanvas.height = qrCanvas.height + borderWidth * 2;
    const borderedCtx = borderedCanvas.getContext('2d');

    borderedCtx.fillStyle = '#FFFFFF';
    borderedCtx.fillRect(0, 0, borderedCanvas.width, borderedCanvas.height);
    borderedCtx.drawImage(qrCanvas, borderWidth, borderWidth);

    // Cria um link temporário para iniciar o download
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = borderedCanvas.toDataURL("image/png");
    link.click();
}

/**
 * Função principal de inicialização da página do gerador de QR Code.
 */
export function initializeQrCodePage() {
    if (qrCodeInitialized) return;

    const logoSizeInput = document.getElementById('qr-logo-size');
    const logoSizeValue = document.getElementById('qr-logo-size-value');

    if (logoSizeInput && logoSizeValue) {
        logoSizeInput.addEventListener('input', (event) => {
            logoSizeValue.textContent = event.target.value + '%';
        });
    }

    document.getElementById('generate-qr-btn').addEventListener('click', generateQRCode);
    document.getElementById('download-qr-btn').addEventListener('click', downloadQRCode);

    qrCodeInitialized = true;
}

