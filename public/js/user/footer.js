// public/js/user/footer.js

// (1) Caricamento footer come prima…
window.addEventListener('DOMContentLoaded', () => {
    fetch('/partials/footer.html')
      .then(r => r.text())
      .then(html => {
        document.querySelector('#footer').innerHTML = html;
        initFooter();
      });
  });
  
  // (2) Init click su footer
  function initFooter() {
    const footer = document.querySelector('.footer-nav');
    footer.addEventListener('click', e => {
      const item = e.target.closest('.footer-item');
      if (!item) return;
  
      const modalName = item.dataset.modal; // "rulesModal", ecc.
      if (modalName) {
        openModal(modalName.replace('Modal', '').toLowerCase());
        return;
      }
    // Sign Out
    if (item.id === 'signOutBtn') {
        doSignOut();
      }
    });
  }
  
  
  // (3) Open/close modal
  function openModal(name) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');
    // carica il file corrispondente in /modals
    fetch(`/modals/${name}.html`)
      .then(r => r.text())
      .then(html => {
        content.innerHTML = html;
        modal.classList.remove('hidden');
      });
  }
  
  function closeModal() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');
    content.innerHTML = '';
    modal.classList.add('hidden');
  }
  
  // (4) Eventi di chiusura
  document.addEventListener('click', e => {
    // se clicco sul bottone o su QUALSIASI sua parte
    if (e.target.closest('#modal-close') || e.target.closest('.modal-overlay')) {
      closeModal();
    }
  });
  
  function doSignOut() {
    // Rimuovi TUTTI i dati utente dal localStorage (parametro a piacere)
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    // …se hai salvato altro (es. userName), rimuovili pure:
    // localStorage.removeItem('userName');
  
    // (opzionale) Se hai cookie di sessione, potresti volerli cancellare:
    // document.cookie = 'session=; Max-Age=0; path=/';
  
    // Reindirizza alla pagina di ingresso/index
    window.location.href = '/index.html';
  }