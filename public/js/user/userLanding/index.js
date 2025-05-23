import { initUserLanding, showActive, showCompleted } from './ui.js';
import { initGameTypeModal, showGameTypeModal } from './gameTypeModal.js';


// ENTRYPOINT
document.addEventListener('DOMContentLoaded', () => {
      initUserLanding();            // ← ora esiste
      initGameTypeModal();          // prepara modale “New Game”

    document.getElementById('playButton')
      ?.addEventListener('click', showGameTypeModal);
  
    document.getElementById('tabActive')
      ?.addEventListener('click', showActive);
  
    document.getElementById('tabCompleted')
      ?.addEventListener('click', showCompleted);
  
    document.getElementById('signOutBtn')
      ?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/signin.html';
      });
  });

