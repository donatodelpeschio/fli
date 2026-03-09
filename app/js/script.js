// State
let calculationMode = 'lordo'; // 'lordo' or 'netto'

// Limits as per Italian law for occasional work
const LIMITS = {
    LORDO_MAX: 5000,
    NETTO_MAX: 4000,
    STAMP_TAX_THRESHOLD: 77.47
};

// Elements
const form = document.getElementById('receiptForm');
const amountInput = document.getElementById('amount');
const amountLabel = document.getElementById('amountLabel');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const generatePDFBtn = document.getElementById('generatePDF');

// Set today's date as default
document.getElementById('workDate').valueAsDate = new Date();
document.getElementById('receiptNumber').value = '001/' + new Date().getFullYear();

// Payment method handler
const paymentMethodSelect = document.getElementById('paymentMethod');
const bankDetails = document.getElementById('bankDetails');
const otherPaymentDetails = document.getElementById('otherPaymentDetails');
const ibanInput = document.getElementById('iban');
const accountHolderInput = document.getElementById('accountHolder');

paymentMethodSelect.addEventListener('change', function() {
    const value = this.value;

    // Reset visibility
    bankDetails.style.display = 'none';
    otherPaymentDetails.style.display = 'none';

    // Reset required fields
    ibanInput.removeAttribute('required');
    accountHolderInput.removeAttribute('required');
    document.getElementById('otherPaymentInfo').removeAttribute('required');

    if (value === 'bonifico') {
        bankDetails.style.display = 'block';
        ibanInput.setAttribute('required', 'required');
        accountHolderInput.setAttribute('required', 'required');

        // Auto-fill account holder with sender name if empty
        if (!accountHolderInput.value) {
            accountHolderInput.value = document.getElementById('senderName').value;
        }
    } else if (value === 'altro') {
        otherPaymentDetails.style.display = 'block';
        document.getElementById('otherPaymentInfo').setAttribute('required', 'required');
    }

    updatePreview();
});

// Auto-update account holder when sender name changes
document.getElementById('senderName').addEventListener('input', function() {
    if (paymentMethodSelect.value === 'bonifico' && !accountHolderInput.value) {
        accountHolderInput.value = this.value;
    }
});

// Format IBAN input
ibanInput.addEventListener('input', function() {
    let value = this.value.replace(/\s/g, '').toUpperCase();

    // Add spaces every 4 characters for readability
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formatted += ' ';
        }
        formatted += value[i];
    }

    this.value = formatted;
});

// IBAN validation
function validateIBAN(iban) {
    const cleaned = iban.replace(/\s/g, '');

    // Basic Italian IBAN format check
    if (!cleaned.match(/^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/)) {
        return false;
    }

    return true;
}

// Toggle calculation mode
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        calculationMode = btn.dataset.mode;

        if (calculationMode === 'lordo') {
            amountLabel.textContent = 'Importo Lordo (€)';
            amountInput.max = LIMITS.LORDO_MAX;
        } else {
            amountLabel.textContent = 'Importo Netto (€)';
            amountInput.max = LIMITS.NETTO_MAX;
        }

        updateCalculations();
    });
});

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

// Calculate amounts
function calculateAmounts(inputValue) {
    const amount = parseFloat(inputValue) || 0;

    if (calculationMode === 'lordo') {
        const lordo = amount;
        const ritenuta = lordo * 0.20;
        const netto = lordo - ritenuta;
        return { lordo, ritenuta, netto };
    } else {
        const netto = amount;
        const lordo = netto / 0.80;
        const ritenuta = lordo * 0.20;
        return { lordo, ritenuta, netto };
    }
}

// Check and display limit alerts
function checkLimits(amounts) {
    const limitAlert = document.getElementById('limitAlert');

    if (amounts.lordo > LIMITS.LORDO_MAX) {
        if (!limitAlert) {
            // Create limit alert if it doesn't exist
            const alert = document.createElement('div');
            alert.id = 'limitAlert';
            alert.className = 'limit-alert';
            alert.innerHTML = `
                <div class="limit-alert-icon">🚫</div>
                <div class="limit-alert-content">
                    <strong>Limite superato!</strong>
                    <p>L'importo lordo supera €5.000,00, limite massimo per prestazioni occasionali.</p>
                    <p style="font-size: 0.75rem; margin-top: 0.5rem;">Oltre questo limite è necessario aprire Partita IVA (art. 44 D.L. 269/2003).</p>
                </div>
            `;

            // Insert after stamp alert
            const stampAlert = document.getElementById('stampAlert');
            stampAlert.parentNode.insertBefore(alert, stampAlert.nextSibling);
        }
        limitAlert.style.display = 'flex';
        return false;
    } else {
        if (limitAlert) {
            limitAlert.style.display = 'none';
        }
        return true;
    }
}

// Update calculations and preview
function updateCalculations() {
    const amounts = calculateAmounts(amountInput.value);

    // Check limits
    checkLimits(amounts);

    // Update display
    document.getElementById('displayLordo').textContent = formatCurrency(amounts.lordo);
    document.getElementById('displayRitenuta').textContent = formatCurrency(amounts.ritenuta);
    document.getElementById('displayNetto').textContent = formatCurrency(amounts.netto);

    // Update preview
    document.getElementById('previewAmountLordo').textContent = formatCurrency(amounts.lordo);
    document.getElementById('previewAmountRitenuta').textContent = formatCurrency(amounts.ritenuta);
    document.getElementById('previewAmountNetto').textContent = formatCurrency(amounts.netto);

    // Show/hide stamp tax alert and note
    const stampAlert = document.getElementById('stampAlert');
    const stampTaxNote = document.getElementById('stampTaxNote');
    const requiresStamp = amounts.lordo > LIMITS.STAMP_TAX_THRESHOLD;

    if (requiresStamp) {
        stampAlert.style.display = 'flex';
        stampTaxNote.style.display = 'list-item';
    } else {
        stampAlert.style.display = 'none';
        stampTaxNote.style.display = 'none';
    }
}

// Update preview fields
function updatePreview() {
    // Receipt details
    document.getElementById('previewReceiptNumber').textContent =
        document.getElementById('receiptNumber').value || '---';

    const dateValue = document.getElementById('workDate').value;
    if (dateValue) {
        const date = new Date(dateValue);
        document.getElementById('previewDate').textContent =
            date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    const hours = document.getElementById('hours').value;
    const hoursField = document.getElementById('previewHoursField');
    if (hours) {
        hoursField.style.display = 'flex';
        document.getElementById('previewHours').textContent = hours + ' ore';
    } else {
        hoursField.style.display = 'none';
    }

    document.getElementById('previewDescription').textContent =
        document.getElementById('description').value || '---';

    // Sender
    document.getElementById('previewSenderName').textContent =
        document.getElementById('senderName').value || '---';
    document.getElementById('previewSenderCF').textContent =
        document.getElementById('senderCF').value || '---';

    const senderPIVA = document.getElementById('senderPIVA').value;
    const senderPIVAField = document.getElementById('previewSenderPIVAField');
    if (senderPIVA) {
        senderPIVAField.style.display = 'flex';
        document.getElementById('previewSenderPIVA').textContent = senderPIVA;
    } else {
        senderPIVAField.style.display = 'none';
    }

    document.getElementById('previewSenderAddress').textContent =
        document.getElementById('senderAddress').value || '---';

    // Recipient
    document.getElementById('previewRecipientName').textContent =
        document.getElementById('recipientName').value || '---';

    const recipientCF = document.getElementById('recipientCF').value;
    const recipientCFField = document.getElementById('previewRecipientCFField');
    if (recipientCF) {
        recipientCFField.style.display = 'flex';
        document.getElementById('previewRecipientCF').textContent = recipientCF;
    } else {
        recipientCFField.style.display = 'none';
    }

    document.getElementById('previewRecipientPIVA').textContent =
        document.getElementById('recipientPIVA').value || '---';
    document.getElementById('previewRecipientAddress').textContent =
        document.getElementById('recipientAddress').value || '---';

    // Payment method
    const paymentMethod = document.getElementById('paymentMethod').value;
    const previewPaymentSection = document.getElementById('previewPaymentSection');
    const previewBankDetailsSection = document.getElementById('previewBankDetailsSection');
    const previewOtherPaymentSection = document.getElementById('previewOtherPaymentSection');

    if (paymentMethod) {
        previewPaymentSection.style.display = 'block';

        const paymentMethodNames = {
            'bonifico': 'Bonifico Bancario',
            'contanti': 'Contanti',
            'assegno': 'Assegno',
            'paypal': 'PayPal',
            'stripe': 'Stripe/Carta',
            'altro': 'Altro'
        };

        document.getElementById('previewPaymentMethod').textContent =
            paymentMethodNames[paymentMethod] || '---';

        if (paymentMethod === 'bonifico') {
            previewBankDetailsSection.style.display = 'block';
            previewOtherPaymentSection.style.display = 'none';

            document.getElementById('previewIban').textContent =
                document.getElementById('iban').value || '---';
            document.getElementById('previewAccountHolder').textContent =
                document.getElementById('accountHolder').value || '---';

            const bankName = document.getElementById('bankName').value;
            const bankNameField = document.getElementById('previewBankNameField');
            if (bankName) {
                bankNameField.style.display = 'flex';
                document.getElementById('previewBankName').textContent = bankName;
            } else {
                bankNameField.style.display = 'none';
            }
        } else if (paymentMethod === 'altro') {
            previewBankDetailsSection.style.display = 'none';
            previewOtherPaymentSection.style.display = 'block';

            document.getElementById('previewOtherPayment').textContent =
                document.getElementById('otherPaymentInfo').value || '---';
        } else {
            previewBankDetailsSection.style.display = 'none';
            previewOtherPaymentSection.style.display = 'none';
        }
    } else {
        previewPaymentSection.style.display = 'none';
    }

    updateCalculations();
}

// Event listeners
amountInput.addEventListener('input', updateCalculations);

form.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('input', updatePreview);
});

// Generate PDF
generatePDFBtn.addEventListener('click', async () => {
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Validate IBAN if payment method is bonifico
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (paymentMethod === 'bonifico') {
        const iban = document.getElementById('iban').value;
        if (iban && !validateIBAN(iban)) {
            alert('IBAN non valido. Verifica il formato (deve iniziare con IT seguito da 25 caratteri).');
            document.getElementById('iban').focus();
            return;
        }
    }

    // Check amount limits
    const amounts = calculateAmounts(amountInput.value);
    if (amounts.lordo > LIMITS.LORDO_MAX) {
        alert(`Attenzione: l'importo lordo supera il limite di €${LIMITS.LORDO_MAX.toLocaleString('it-IT')} per prestazioni occasionali.\n\nOltre questo limite è necessario aprire Partita IVA secondo la normativa italiana (art. 44 D.L. 269/2003).`);
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('RICEVUTA PER PRESTAZIONE OCCASIONALE', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('N. ' + document.getElementById('receiptNumber').value, 105, 28, { align: 'center' });

    let y = 45;

    // Prestatore section
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('PRESTATORE', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Nome: ' + document.getElementById('senderName').value, 20, y);
    y += 6;
    doc.text('C.F.: ' + document.getElementById('senderCF').value, 20, y);
    y += 6;

    const senderPIVA = document.getElementById('senderPIVA').value;
    if (senderPIVA) {
        doc.text('P.IVA: ' + senderPIVA, 20, y);
        y += 6;
    }

    doc.text('Indirizzo: ' + document.getElementById('senderAddress').value, 20, y);
    y += 12;

    // Cliente section
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('CLIENTE', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Nome: ' + document.getElementById('recipientName').value, 20, y);
    y += 6;

    const recipientCF = document.getElementById('recipientCF').value;
    if (recipientCF) {
        doc.text('C.F.: ' + recipientCF, 20, y);
        y += 6;
    }

    doc.text('P.IVA: ' + document.getElementById('recipientPIVA').value, 20, y);
    y += 6;
    doc.text('Indirizzo: ' + document.getElementById('recipientAddress').value, 20, y);
    y += 12;

    // Dettagli prestazione
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('DETTAGLI PRESTAZIONE', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const dateValue = new Date(document.getElementById('workDate').value);
    doc.text('Data: ' + dateValue.toLocaleDateString('it-IT'), 20, y);
    y += 6;

    const hours = document.getElementById('hours').value;
    if (hours) {
        doc.text('Ore lavorate: ' + hours, 20, y);
        y += 6;
    }

    const description = document.getElementById('description').value;
    const splitDesc = doc.splitTextToSize('Descrizione: ' + description, 170);
    doc.text(splitDesc, 20, y);
    y += splitDesc.length * 6 + 6;

    // Payment method section
    if (paymentMethod) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('MODALITÀ DI PAGAMENTO', 20, y);
        doc.setTextColor(0, 0, 0);
        y += 8;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        const paymentMethodNames = {
            'bonifico': 'Bonifico Bancario',
            'contanti': 'Contanti',
            'assegno': 'Assegno',
            'paypal': 'PayPal',
            'stripe': 'Stripe/Carta',
            'altro': 'Altro'
        };

        doc.text('Metodo: ' + paymentMethodNames[paymentMethod], 20, y);
        y += 6;

        if (paymentMethod === 'bonifico') {
            const iban = document.getElementById('iban').value;
            const accountHolder = document.getElementById('accountHolder').value;
            const bankName = document.getElementById('bankName').value;

            if (iban) {
                doc.text('IBAN: ' + iban, 20, y);
                y += 6;
            }
            if (accountHolder) {
                doc.text('Intestatario: ' + accountHolder, 20, y);
                y += 6;
            }
            if (bankName) {
                doc.text('Banca: ' + bankName, 20, y);
                y += 6;
            }
        } else if (paymentMethod === 'altro') {
            const otherInfo = document.getElementById('otherPaymentInfo').value;
            if (otherInfo) {
                doc.text('Dettagli: ' + otherInfo, 20, y);
                y += 6;
            }
        }

        y += 6;
    }

    // Amount box
    y += 5;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(20, y, 170, 30);

    y += 8;
    doc.setFontSize(10);
    doc.text('Compenso Lordo:', 25, y);
    doc.text(formatCurrency(amounts.lordo), 185, y, { align: 'right' });
    y += 7;

    doc.text('Ritenuta d\'Acconto (20%):', 25, y);
    doc.text(formatCurrency(amounts.ritenuta), 185, y, { align: 'right' });
    y += 7;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Netto a Pagare:', 25, y);
    doc.text(formatCurrency(amounts.netto), 185, y, { align: 'right' });

    y += 15;

    // Legal notes
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(59, 130, 246);
    doc.text('DICHIARAZIONI E NOTE LEGALI', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);

    const legalNotes = [
        'Il/La sottoscritto/a dichiara che la prestazione resa ha carattere del tutto occasionale, non svolgendo prestazione di lavoro autonomo con carattere di abitualità.',
        'Il/La sottoscritto/a dichiara di non aver fruito nell\'anno, ai fini contributivi, della franchigia di €5.000,00 prevista dall\'art. 44 del D.L. 30 settembre 2003, n. 269, convertito con modificazioni dalla L. 24 novembre 2003, n. 326.',
        'La presente prestazione non è soggetta ad IVA ai sensi dell\'art. 5 del D.P.R. 633/1972.',
        'Le parti autorizzano il trattamento dei dati personali ai fini amministrativi e fiscali ai sensi del Reg. UE 679/2016 (GDPR).'
    ];

    // Add stamp tax note if required
    if (amounts.lordo > LIMITS.STAMP_TAX_THRESHOLD) {
        legalNotes.push('Imposta di bollo da €2,00 da applicarsi sull\'originale ai sensi del D.P.R. 642/1972, art. 2 (importo superiore a €77,47).');
    }

    legalNotes.forEach(note => {
        const splitNote = doc.splitTextToSize('• ' + note, 165);
        doc.text(splitNote, 23, y);
        y += splitNote.length * 3.5 + 2;
    });

    // Signature
    y = 260;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Firma del Prestatore', 130, y);
    doc.line(130, y + 15, 190, y + 15);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generato con Freelance Invoice - fli.dfix.it', 105, 285, { align: 'center' });

    // Save
    const fileName = `Ricevuta_${document.getElementById('receiptNumber').value.replace(/\//g, '-')}_${document.getElementById('recipientName').value.replace(/\s/g, '_')}.pdf`;
    doc.save(fileName);
});

// Initialize
updatePreview();

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install prompt after 3 seconds
    setTimeout(showInstallPrompt, 3000);
});

function showInstallPrompt() {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'install-prompt';
    promptDiv.innerHTML = `
        <div class="install-prompt-content">
            <p><strong>📲 Installa Freelance Invoice</strong></p>
            <p style="font-size: 0.75rem; margin-top: 0.25rem;">Accedi velocemente anche offline!</p>
        </div>
        <button id="installBtn">Installa</button>
        <button class="install-prompt-close" id="closePrompt">✕</button>
    `;
    document.body.appendChild(promptDiv);

    setTimeout(() => {
        promptDiv.classList.add('show');
    }, 100);

    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            deferredPrompt = null;
            promptDiv.remove();
        }
    });

    document.getElementById('closePrompt').addEventListener('click', () => {
        promptDiv.remove();
    });
}

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}