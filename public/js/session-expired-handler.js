export function setupSessionExpiredHandler() {
    if (window.__sessionHandlerSetup) return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new Event('session-expired'));
      }
      return response;
    };
    window.__sessionHandlerSetup = true;
  }
  
  export function showSessionExpiredPopup() {
    // non duplicare
    if (document.getElementById('sessionExpiredModal')) return;
  
    // overlay
    const overlay = document.createElement('div');
    overlay.id = 'sessionExpiredModal';
    overlay.className = 'modal-insuf';
  
    // contenuto
    const box = document.createElement('div');
    box.className = 'modal-insuf-content';
  
    // span “×” (chiusura)
    const closeSpan = document.createElement('span');
    closeSpan.className = 'close';
    closeSpan.innerHTML = '&times;';
    closeSpan.addEventListener('click', removeModal);
  
    // messaggio
    const msg = document.createElement('p');
    msg.id = 'sessionExpiredMessage';
    msg.textContent = 'La tua sessione è scaduta. Effettua nuovamente il login per continuare.';
  
    // pulsante OK
    const btn = document.createElement('button');
    btn.id = 'sessionExpiredClose';
    btn.className = 'footer_button footer_button_orange';
    btn.textContent = 'OK';
    btn.addEventListener('click', () => {
      // rimuovi token oppure clear se vuoi
      localStorage.clear();
      window.location.href = 'signin.html';
    });
  
    // monta
    box.appendChild(closeSpan);
    box.appendChild(msg);
    box.appendChild(document.createElement('br'));
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  
    // funzione di rimozione
    function removeModal() {
      overlay.remove();
    }
  }
  
  
  window.addEventListener('session-expired', showSessionExpiredPopup);
  setupSessionExpiredHandler();