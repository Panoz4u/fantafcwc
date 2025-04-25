// Importa la funzione getTotalCost dal modulo teamUtils
import { getTotalCost } from './teamUtils.js';
import { confirmSquad } from './confirmSquad.js';  // Modifica qui: importa da confirmSquad.js invece di team_creation.js

// Variabile per memorizzare il moltiplicatore selezionato
let selectedMultiplier = 1;

// Funzione per mostrare l'overlay del moltiplicatore
export function showMultiplyOverlay(getTotalCostFn) {
  console.log("showMultiplyOverlay: Inizio funzione"); // Log inizio
  // Ottieni il costo totale della squadra utilizzando la funzione passata o quella predefinita
  const totalCost = getTotalCostFn ? getTotalCostFn() : getTotalCost();
  console.log("showMultiplyOverlay: totalCost =", totalCost); // Log costo totale

  // Se non ci sono giocatori (costo totale = 0), non mostrare l'overlay
  if (totalCost <= 0) {
    console.log("showMultiplyOverlay: totalCost <= 0, chiamo confirmSquad direttamente."); // Log costo zero
    const lockedMultiply = window.lockedMultiply || localStorage.getItem("lockedMultiply");
    console.log("showMultiplyOverlay: Valore lockedMultiply per costo zero:", lockedMultiply); // Log lockedMultiply per costo zero
    confirmSquad(lockedMultiply ? parseFloat(lockedMultiply) : 1);
    return;
  }

  // Controlla se il moltiplicatore è bloccato
  const lockedMultiplyValue = window.lockedMultiply || localStorage.getItem("lockedMultiply");
  const isMultiplyLocked = lockedMultiplyValue !== null;
  console.log("showMultiplyOverlay: window.lockedMultiply =", window.lockedMultiply); // Log window.lockedMultiply
  console.log("showMultiplyOverlay: localStorage lockedMultiply =", localStorage.getItem("lockedMultiply")); // Log localStorage
  console.log("showMultiplyOverlay: lockedMultiplyValue =", lockedMultiplyValue, "isMultiplyLocked =", isMultiplyLocked); // Log stato blocco

  // Aggiorna il titolo dell'overlay
  const titleElement = document.querySelector('#multiplyOverlay .title_centre');
  if (titleElement) {
    if (isMultiplyLocked) {
      console.log("showMultiplyOverlay: Imposto titolo 'MULTIPLY IS FIXED'"); // Log titolo bloccato
      titleElement.innerHTML = 'MULTIPLY IS FIXED<br>X';
    } else {
      console.log("showMultiplyOverlay: Imposto titolo 'MULTIPLY YOUR WIN'"); // Log titolo normale
      titleElement.innerHTML = 'MULTIPLY YOUR WIN<br>X';
    }
  }

  // Imposta il moltiplicatore iniziale (o bloccato)
  selectedMultiplier = isMultiplyLocked ? parseFloat(lockedMultiplyValue) : 1;
  console.log("showMultiplyOverlay: selectedMultiplier impostato a:", selectedMultiplier); // Log moltiplicatore iniziale

  // Aggiorna il costo visualizzato nell'overlay
  updateMultipliedCost(); // Assicurati che il costo sia aggiornato con il moltiplicatore corretto

  // Mostra l'overlay
  const overlay = document.getElementById('multiplyOverlay');
  if (overlay) {
    console.log("showMultiplyOverlay: Mostro overlay"); // Log mostra overlay
    overlay.style.display = 'flex';
  }

  // Aggiungi event listeners ai cerchi del moltiplicatore (ora gestisce lo stato bloccato)
  setupMultiplyCircles();

  // Aggiungi event listeners ai pulsanti
  setupMultiplyButtons();
  console.log("showMultiplyOverlay: Fine funzione"); // Log fine
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
  console.log("setupMultiplyCircles: Inizio funzione"); // Log inizio
  const circles = document.querySelectorAll('.multiply-circle');
  const lockedMultiplyValue = window.lockedMultiply || localStorage.getItem("lockedMultiply");
  const isMultiplyLocked = lockedMultiplyValue !== null;
  const currentSelectedMultiplier = isMultiplyLocked ? parseFloat(lockedMultiplyValue) : selectedMultiplier;
  console.log("setupMultiplyCircles: lockedMultiplyValue =", lockedMultiplyValue, "isMultiplyLocked =", isMultiplyLocked, "currentSelectedMultiplier =", currentSelectedMultiplier); // Log stato blocco e valore

  // Rimuovi prima tutti gli event listeners esistenti per evitare duplicati
  circles.forEach(circle => {
    const newCircle = circle.cloneNode(true);
    circle.parentNode.replaceChild(newCircle, circle);
  });
  console.log("setupMultiplyCircles: Event listeners rimossi e nodi clonati"); // Log clonazione

  // Aggiungi nuovi event listeners e imposta lo stato iniziale/bloccato
  document.querySelectorAll('.multiply-circle').forEach(circle => {
    const circleValue = parseFloat(circle.dataset.multiply);
    console.log(`setupMultiplyCircles: Processo cerchio con valore ${circleValue}`); // Log processo cerchio

    // Imposta lo stato visivo iniziale/bloccato
    if (circleValue === currentSelectedMultiplier) {
      console.log(`setupMultiplyCircles: Cerchio ${circleValue} corrisponde a currentSelectedMultiplier. Imposto mc-on.`); // Log cerchio selezionato
      circle.classList.remove('mc-off');
      circle.classList.add('mc-on');
    } else {
      console.log(`setupMultiplyCircles: Cerchio ${circleValue} NON corrisponde a currentSelectedMultiplier. Imposto mc-off.`); // Log cerchio non selezionato
      circle.classList.remove('mc-on');
      circle.classList.add('mc-off');
    }

    // Se il moltiplicatore è bloccato, disabilita l'interazione
    if (isMultiplyLocked) {
      console.log(`setupMultiplyCircles: Moltiplicatore BLOCCATO. Disabilito interazione per cerchio ${circleValue}.`); // Log blocco attivo per cerchio
      circle.style.pointerEvents = 'none'; // Disabilita click
      if (circleValue !== currentSelectedMultiplier) {
        console.log(`setupMultiplyCircles: Cerchio ${circleValue} non selezionato, imposto opacità 0.5.`); // Log opacità ridotta
        circle.style.opacity = '0.5';
      } else {
         console.log(`setupMultiplyCircles: Cerchio ${circleValue} selezionato, imposto opacità 1.`); // Log opacità normale
         circle.style.opacity = '1';
      }
    } else {
      console.log(`setupMultiplyCircles: Moltiplicatore NON bloccato. Abilito interazione per cerchio ${circleValue}.`); // Log blocco non attivo per cerchio
      // Se non è bloccato, abilita l'interazione e resetta lo stile
      circle.style.pointerEvents = '';
      circle.style.opacity = '';

      // Aggiungi event listener per il click solo se non è bloccato
      circle.addEventListener('click', function() {
        console.log(`setupMultiplyCircles: Click su cerchio ${this.dataset.multiply}`); // Log click
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
        console.log(`setupMultiplyCircles: selectedMultiplier aggiornato a ${selectedMultiplier}`); // Log aggiornamento moltiplicatore

        // Aggiorna il costo visualizzato
        updateMultipliedCost();
      });
    }
  });
  console.log("setupMultiplyCircles: Fine funzione"); // Log fine
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

