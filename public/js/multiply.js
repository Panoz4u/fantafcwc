// Importa la funzione getTotalCost dal modulo teamUtils
import { getTotalCost } from './teamUtils.js';
import { confirmSquad } from './confirmSquad.js';  // Modifica qui: importa da confirmSquad.js invece di team_creation.js

// Variabile per memorizzare il moltiplicatore selezionato
let selectedMultiplier = 1;

// Funzione per mostrare l'overlay del moltiplicatore
export function showMultiplyOverlay() {
  // Ottieni il costo totale della squadra
  const totalCost = getTotalCost();
  
  // Se non ci sono giocatori (costo totale = 0), non mostrare l'overlay
  if (totalCost <= 0) {
    // Chiama direttamente confirmSquad con moltiplicatore 1
    confirmSquad(1);
    return;
  }
  
  // Aggiorna il costo visualizzato nell'overlay
  updateMultipliedCost();
  
  // Mostra l'overlay
  const overlay = document.getElementById('multiplyOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
  
  // Aggiungi event listeners ai cerchi del moltiplicatore
  setupMultiplyCircles();
  
  // Aggiungi event listeners ai pulsanti
  setupMultiplyButtons();
}

// Funzione per aggiornare il costo visualizzato in base al moltiplicatore selezionato
function updateMultipliedCost() {
  const totalCost = getTotalCost();
  const multipliedCost = (totalCost * selectedMultiplier).toFixed(1);
  const multipliedCostEl = document.getElementById('multipliedCost');
  if (multipliedCostEl) {
    multipliedCostEl.textContent = multipliedCost;
  }
}

// Funzione per configurare i cerchi del moltiplicatore
function setupMultiplyCircles() {
  const circles = document.querySelectorAll('.multiply-circle');
  
  // Rimuovi prima tutti gli event listeners esistenti
  circles.forEach(circle => {
    const newCircle = circle.cloneNode(true);
    circle.parentNode.replaceChild(newCircle, circle);
  });
  
  // Aggiungi nuovi event listeners
  document.querySelectorAll('.multiply-circle').forEach(circle => {
    // Imposta il cerchio con moltiplicatore 1 come selezionato di default
    if (parseInt(circle.dataset.multiply) === 1) {
      circle.classList.remove('mc-off');
      circle.classList.add('mc-on');
    } else {
      circle.classList.remove('mc-on');
      circle.classList.add('mc-off');
    }
    
    // Aggiungi event listener per il click
    circle.addEventListener('click', function() {
      // Rimuovi la classe attiva da tutti i cerchi
      document.querySelectorAll('.multiply-circle').forEach(c => {
        c.classList.remove('mc-on');
        c.classList.add('mc-off');
      });
      
      // Aggiungi la classe attiva al cerchio cliccato
      this.classList.remove('mc-off');
      this.classList.add('mc-on');
      
      // Aggiorna il moltiplicatore selezionato
      selectedMultiplier = parseInt(this.dataset.multiply);
      
      // Aggiorna il costo visualizzato
      updateMultipliedCost();
    });
  });
}

// Funzione per configurare i pulsanti dell'overlay
function setupMultiplyButtons() {
  // Pulsante Cancel
  const cancelBtn = document.getElementById('cancelMultiply');
  if (cancelBtn) {
    // Rimuovi prima tutti gli event listeners esistenti
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Aggiungi nuovo event listener
    document.getElementById('cancelMultiply').addEventListener('click', function() {
      // Nascondi l'overlay
      const overlay = document.getElementById('multiplyOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    });
  }
  
  // Pulsante Confirm
  const confirmBtn = document.getElementById('confirmMultiply');
  if (confirmBtn) {
    // Rimuovi prima tutti gli event listeners esistenti
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Aggiungi nuovo event listener
    document.getElementById('confirmMultiply').addEventListener('click', function() {
      // Salva il moltiplicatore selezionato nel localStorage
      localStorage.setItem('selectedMultiplier', selectedMultiplier.toString());
      
      // Nascondi l'overlay
      const overlay = document.getElementById('multiplyOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
      
      // Chiama la funzione confirmSquad con il moltiplicatore selezionato
      confirmSquad(selectedMultiplier);
    });
  }
}

