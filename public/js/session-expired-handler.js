export function setupSessionExpiredHandler() {
    console.log('✅ session-expired-handler caricato');
    if (window.__sessionHandlerSetup) return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 || response.status === 403) {
        showSessionExpiredPopup();
        return Promise.reject({ code: 'SESSION_EXPIRED' });
      }
      return response;
    };
    window.__sessionHandlerSetup = true;
  }
  
  export function showSessionExpiredPopup() {
    console.log('🚨 showSessionExpiredPopup invocato');
    if (document.getElementById('sessionExpiredOverlay')) return;
  
    // Overlay full screen
    const overlay = document.createElement('div');
    overlay.id = 'sessionExpiredOverlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      zIndex: '10000'
    });
  
    // Box contenuto
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'relative',
      background: '#000',
      color: '#fff',
      padding: '20px',
      borderRadius: '4px',
      textAlign: 'center',
      maxWidth: '300px',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: '16px'
    });
  
    // Chiudi (X) in alto a destra
    const closeSpan = document.createElement('span');
    closeSpan.innerHTML = '&times;';
    Object.assign(closeSpan.style, {
      position: 'absolute',
      top: '8px',
      right: '8px',
      cursor: 'pointer',
      fontSize: '18px',
      fontWeight: 'bold'
    });
    closeSpan.addEventListener('click', removeModal);
  
    // Messaggio
    const msg = document.createElement('p');
    msg.id = 'sessionExpiredMessage';
    msg.textContent = 'La tua sessione è scaduta. Effettua nuovamente il login per continuare.';
  
    // Bottone OK
    const btn = document.createElement('button');
    btn.id = 'sessionExpiredClose';
    btn.className = 'footer_button footer_button_orange';
    btn.textContent = 'OK';
    btn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'signin.html';
    });
  
    // Monta modale
    box.appendChild(closeSpan);
    box.appendChild(msg);
    box.appendChild(document.createElement('br'));
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  
    function removeModal() {
      overlay.remove();
    }
  }
  
  window.addEventListener('session-expired', showSessionExpiredPopup);
  setupSessionExpiredHandler();
  