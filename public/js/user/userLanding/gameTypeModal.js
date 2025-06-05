// public/js/user/userLanding/gameTypeModal.js
let overlay, dialog;

export function initGameTypeModal() {
// 1) Overlay
overlay = document.createElement('div');
overlay.id = 'gameTypeOverlay';
overlay.className = 'modal-game-type-overlay hidden';

// 2) Dialog box
dialog = document.createElement('div');
dialog.id = 'gameTypeDialog';
dialog.className = 'modal-game-type-content';
dialog.innerHTML = `
 <h3 class="modal-game-type-title">Choose your challenge</h3>
  <div class="modal-game-type-options">
    <div id="optHead2Head" class="modal-game-type-option">
      <span class="modal-game-type-option-icon">👑</span>
      <span class="modal-game-type-option-label">HEAD 2 HEAD</span>
    </div>
    <div id="optPrivate" class="modal-game-type-option">
      <span class="modal-game-type-option-icon">🔒</span>
      <span class="modal-game-type-option-label">PRIVATE LEAGUE</span>
    </div>
  </div>
  <button id="gameTypeClose" class="modal-game-type-close">×</button>
`;

overlay.appendChild(dialog);
document.body.appendChild(overlay);

// 3) Chiusura modale cliccando fuori o su ×
overlay.addEventListener('click', e => {
  if (e.target === overlay || e.target.id === 'gameTypeClose') {
    hideGameTypeModal();
  }
});

// 4) Selezione HEAD 2 HEAD
document.getElementById('optHead2Head')
  .addEventListener('click', () => {
    window.location.href = 'select-opponent.html';
  });

// 5) Selezione PRIVATE LEAGUE
document.getElementById('optPrivate')
  .addEventListener('click', () => {
    window.location.href = 'select-competitors.html';
  });
  }
  
  export function showGameTypeModal() {
    overlay.classList.remove('hidden');
  }
  
  /**
   * Nasconde la modale
   */
  export function hideGameTypeModal() {
    overlay.classList.add('hidden');
  }
  