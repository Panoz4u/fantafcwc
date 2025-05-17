/**
 * contests_commented.js
 * Versione commentata di public/js/user/contests.js
 * Questo file contiene le funzioni per:
 *  - caricare i dati utente e le sfide (loadUserLanding)
 *  - disegnare la lista delle sfide (renderContestList)
 *  - gestire aperture/chiusure di modali e tab
 *
 * Ogni funzione è spiegata passo-passo per facilitare la comprensione.
 */

// --------------------------
// 1) Funzioni di utilità modali
// --------------------------



/**
 * Apre una finestra modale (overlay) e blocca lo scroll di sfondo
 * @param {string} modalId - ID del div modal da mostrare
 */
   function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
    document.body.style.overflow = "hidden"; // Impedisce lo scorrimento della pagina sottostante
  }
  
  /**
 * Chiude la finestra modale e ripristina lo scroll della pagina
 * @param {string} modalId - ID del div modal da nascondere
 */

  function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
    document.body.style.overflow = "auto"; // Ripristina lo scorrimento della pagina
  }
  
  // Chiudi la finestra modale quando si clicca all'esterno del contenuto
  window.onclick = function(event) {
    if (event.target.className === "modal") {
      event.target.style.display = "none";
      document.body.style.overflow = "auto";
    }
  };

// --------------------------
// 2) Funzione per determinare l'URL dell'avatar
// --------------------------

/**
 * Restituisce il percorso corretto dell'immagine avatar
 * Gestisce URL esterni, avatar locali e stringhe vuote
 * @param {string} avatar - stringa avatar (URL o nome file)
 * @param {string} username - nome utente (usato come alt text)
 * @param {string} userColor - colore associato all'utente
 * @returns {string} - URL completo dell'immagine da mostrare
 */

  function getAvatarSrc(avatar, username, userColor) {
    console.log("getAvatarSrc chiamata con:", { avatar, username, userColor });
    if (avatar && avatar.trim() !== "") {
      if (avatar.startsWith("http")) {
        // Per gli URL di Google, assicuriamoci che non ci siano problemi di encoding
        if (avatar.includes("googleusercontent.com")) {
          // Decodifica l'URL per assicurarsi che non ci siano problemi di encoding
          return decodeURIComponent(avatar);
        }
        return avatar;
      } else {
        return "avatars/" + avatar;
      }
    } else {
      // Se non c'è avatar, usa l'immagine silhouette predefinita
      return "images/silouette.jpg";
    }
  }

// --------------------------
// 3) Caricamento della pagina utente e delle sfide
// --------------------------

/**
 * Carica i dati header utente e le liste delle sfide
 * - Prende userId e authToken da localStorage
 * - Chiama l'API /api/user-contests
 * - Se OK, ottiene { contests: { active, completed } }
 * - Passa le liste a renderContestList
 */

export async function loadUserLanding() {
    // 1) Prendo userId e authToken
    const userId    = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
  
    // 2) Se manca uno dei due, torno al login
    if (!userId || !authToken) {
      window.location.href = 'signin.html';
      return;
    }
  
    try {
      // 3) Chiamata al server
      const resp = await fetch('/api/user-contests', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Errore backend:', resp.status, errorText);
        alert('Errore nel caricamento utente.');
        return;
      }
  
      // 4) Leggo i dati JSON
      const { contests } = await resp.json();
      console.log('Risposta /api/user-contests →', contests);
      console.log('Dati ricevuti:', contests);
    // --- test nuovo endpoint /api/user-contests ---

  // ---------------------------------------------
      // 6) Render delle due liste
    renderContestList(contests.active,   document.getElementById('activeContainer'));
    renderContestList(contests.completed, document.getElementById('completedContainer'));
    } catch (err) {
      console.error('Errore in loadUserLanding:', err);
    }
    }
  
// --------------------------
// 4) Render delle liste di sfide
// --------------------------

/**
 * Disegna le cards dei contest in un container
 * - Filtra status === 0 (creati) se non vogliamo mostrarli
 * - Per ogni contest, ricava i dati di owner vs opponent
 * - Costruisce dinamicamente il markup HTML
 * @param {Array} list - array di oggetti contest
 * @param {HTMLElement} container - div dove appendere le cards
 */

  export function renderContestList(list, container){
        // 1) validazione: voglio sempre un array
        if (!Array.isArray(list)) {
            console.warn('renderContestList: atteso array, ricevuto', list);
            return;
        }
        // recupero di nuovo userId per poterlo usare anche qui
        const userId = localStorage.getItem('userId');
        container.innerHTML = "";
        /// 2) rimuovo i contest 'creati' (status 0)
        const filteredList = list.filter(contest => contest.status !== 0);


    // Aggiungo il console log per le sfide in status 5
    const status5Contests = filteredList.filter(contest => contest.status == 5);
    console.log(`Numero di sfide in status 5: ${status5Contests.length}`);
    // Log dei dettagli per ogni sfida in status 5
    status5Contests.forEach(contest => {
      // Estrai i dati dai fantasy_teams
      if (contest.fantasy_teams && contest.fantasy_teams.length > 0) {
        contest.fantasy_teams.forEach(team => {
          const myPoints = parseFloat(team.total_points || 0);
          const myResult = team.result || 0;
          const myTeexWon = parseFloat(team.teex_won || 0);
          
          console.log({
            contestId: contest.contest_id,
            userId: team.user_id,
            myPoints: myPoints,
            myResult: myResult,
            myTeexWon: myTeexWon
          });
        });
      }
    });
    // Chiama calculateContestPoints per ogni contest e visualizza i risultati
    filteredList.forEach(contest => {
      fetch(`/fantasy/contest-points?contest_id=${contest.contest_id}`)
        .then(response => response.json())
        .then(data => {
          console.log(`Risultati calculateContestPoints per contest ${contest.contest_id}:`, data);
        })
        .catch(error => {
          console.error(`Errore nel recupero dei punti per il contest ${contest.contest_id}:`, error);
        });
    });
    if (!filteredList.length) {
      // 3) se non ho contest, mostro messaggio "welcome"
      container.innerHTML = `
        <div class="welcome-container">
          <div class="welcome-text">
            <div class="welcome-to">WELCOME TO</div>
            <div class="fanteex-title">FANTA</div>
            <div class="logo-image">
              <img src="images/logo.png" alt="Logo FANTAFCWC" style="display: block; max-width: 200px; margin: 0 auto 20px auto;">
            </div>

            <div class="start-game">START YOUR FIRST GAME</div>
          </div>
          <div class="animated-arrows">
            <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow1">
            <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow2">
            <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow3">
          </div>
        </div>
      `;
      return;
    }
    // 4) per ogni contest rimasto, creo la card
    filteredList.forEach(contest => {
      // Correggiamo la determinazione di iAmOwner confrontando correttamente gli ID
      const iAmOwner = parseInt(contest.owner_id) === parseInt(userId);
      console.log(`Contest ${contest.contest_id}: owner_id=${contest.owner_id}, userId=${userId}, iAmOwner=${iAmOwner}`);
      
      // Scelgo i dati my vs opponent in base a iAmOwner
      let myName, myAvatar, myCost, oppName, oppAvatar, oppCost, myColor, oppColor;
      if (iAmOwner) {
        myName = contest.owner_name;
        myAvatar = contest.owner_avatar;
        myColor = contest.owner_color;
        myCost = parseFloat(contest.owner_cost || 0).toFixed(1);
        oppName = contest.opponent_name;
        oppAvatar = contest.opponent_avatar;
        oppColor = contest.opponent_color;
        oppCost = parseFloat(contest.opponent_cost || 0).toFixed(1);
      } else {
        myName = contest.opponent_name;
        myAvatar = contest.opponent_avatar;
        myColor = contest.opponent_color;
        myCost = parseFloat(contest.opponent_cost || 0).toFixed(1);
        oppName = contest.owner_name;
        oppAvatar = contest.owner_avatar;
        oppColor = contest.owner_color;
        oppCost = parseFloat(contest.owner_cost || 0).toFixed(1);
      }

      // Troncamento nomi a 19 caratteri per coerenza layout
      myName = myName.length > 19 ? myName.substring(0, 19) + "..." : myName;
      oppName = oppName.length > 19 ? oppName.substring(0, 19) + "..." : oppName;

      let displayedStatus = contest.status_display;  // valore di default
      let statusClass = "";
      if (contest.status == 1 && !iAmOwner) {
        displayedStatus = "INVITED";
        statusClass = "invited";
      } else if (contest.status == 2) {
        statusClass = "pending";
      }
    // 5) costruisco l'elemento div contest-card
      const contestCard = document.createElement("div");
      contestCard.classList.add("contest-cell", "clickable");
      
      // Aggiungi l'ID del contest come attributo data per recuperarlo al click
      contestCard.dataset.contestId = contest.contest_id;
      contestCard.dataset.eventUnitId = contest.event_unit_id || '';
      
     // Aggiungo click handler per navigare ai dettagli
      if (!(contest.status == 1 && iAmOwner)) {
        contestCard.addEventListener('click', function() {
          // Salva i parametri nel localStorage
          console.log("Click su contest:", this.dataset.contestId);
          localStorage.setItem('contestId', this.dataset.contestId);
          localStorage.setItem('userId', userId); // Usa userId invece di currentUserId
          
          // Salva anche owner_id e opponent_id
          localStorage.setItem('ownerId', contest.owner_id);
          localStorage.setItem('opponentId', contest.opponent_id);
          
          if (this.dataset.eventUnitId) {
            localStorage.setItem('eventUnitId', this.dataset.eventUnitId);
          } else {
            localStorage.removeItem('eventUnitId');
          }
           // Salva i dati nel formato richiesto da riassunto.html
          const contestData = {
            contestId: this.dataset.contestId,
            opponentId: contest.opponent_id,
            ownerId: contest.owner_id,
            userId: userId,
            timestamp: new Date().getTime()
          };
          localStorage.setItem('contestData', JSON.stringify(contestData));
          
          // Naviga alla pagina dei dettagli senza parametri in URL
          // Se è un contest con status=1 e non sono owner, vai a riassunto.html
          if (contest.status == 1 && !iAmOwner) {
            window.location.href = 'riassunto.html';
          } else {
            window.location.href = 'contest-details.html';
          }
        });
      }
      // Handle status 0 contests like status 1 with "CREATED" text
      
      // 6) a seconda di contest.status genero markup differente
      switch (contest.status) {

        case 0:
          // STATUS 0: appena creato (CREATED)
          contestCard.innerHTML = `
            <div class="contest-container cc-list">
              <div class="contest-bar">
                <img src="${getAvatarSrc(myAvatar, myName, myColor)}" alt="${myName}" class="player-avatar-contest left-avatar">
                <div class="triletter_contest left-name">${myName.substring(0, 6)}</div>
                <div class="result_bold">VS</div>
                <div class="triletter_contest right-name">${oppName.substring(0, 6)}</div>
                <img src="${getAvatarSrc(oppAvatar, oppName, oppColor)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                <div class="teex_spent left-teex">${myCost}</div>
                <div class="teex_spent right-teex">-</div>
              </div>
              <div class="status-badge-base status-badge">CREATED</div>
            </div>
          `;
          break;
        
        //STATUS PENDING O CREATED
        case 1:
          if (iAmOwner) {
            // STATUS 1 & owner: in attesa di risposta (PENDING)
            contestCard.innerHTML = `
              <div class="contest-container cc-list">
                <div class="contest-bar">
                  <img src="${getAvatarSrc(myAvatar, myName, myColor)}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div class="result_bold">VS</div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${getAvatarSrc(oppAvatar, oppName, oppColor)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex">${myCost}</div>
                  <div class="teex_spent right-teex">-</div>
                </div>
                <div class="status-badge-base status-badge">PENDING</div>
                ${contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
              </div>
            `;
          } else {
            // STATUS 1 & non-owner: invitato (INVITED)
            contestCard.innerHTML = `
              <div class="contest-container cc-list">
                <div class="contest-bar">
                  <img src="${getAvatarSrc(myAvatar, myName, myColor)}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div class="result_bold">VS</div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${getAvatarSrc(oppAvatar, oppName, oppColor)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex">-</div>
                  <div class="teex_spent right-teex">${oppCost}</div>
                </div>
                <div class="status-badge-base status-badge-invited">INVITED</div>
                ${contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
              </div>
            `;
          }
          break;
  
          // STATUS 2: Sfida pronta (READY)
          case 2:
            contestCard.innerHTML = `
              <div class="contest-container cc-list">
                <div class="contest-bar">
                  <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div class="result_bold">VS</div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex">${myCost}</div>
                  <div class="teex_spent right-teex">${oppCost}</div>
                </div>
                <div class="status-badge-base status-badge-ready">${contest.stake || ''}</div>
                ${contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
              </div>
            `;
            break;
  
           // STATUS 4: in corso (LIVE) → qui recuperiamo i punti via fetch
           case 4:
              contestCard.innerHTML = ''; // svuoto il contenuto per poi riempirlo asincronamente
              fetch(`/fantasy/contest-points?contest_id=${contest.contest_id}`)
                .then(r => r.json())
                .then(data => {
                  // Determino punteggi basandomi su chi è owner
                  const myPts  = iAmOwner ? data.owner_points   : data.opponent_points;
                  const oppPts = iAmOwner ? data.opponent_points : data.owner_points;
                  const [myI, myD] = parseFloat(myPts||0).toFixed(1).split('.');
                  const [opI, opD] = parseFloat(oppPts||0).toFixed(1).split('.');
          
                  contestCard.innerHTML = `
                    <div class="contest-container cc-list">
                      <div class="contest-bar">
                        <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
                        <div class="triletter_contest left-name">${myName.substring(0,3)}</div>
                        <div class="result-bignum">
                          <span class="result_bold">${myI}</span><span class="win_index_perc">.${myD}</span>
                          <span class="vs-separator"> </span>
                          <span class="result_bold">${opI}</span><span class="win_index_perc">.${opD}</span>
                        </div>
                        <div class="triletter_contest right-name">${oppName.substring(0,3)}</div>
                        <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                        <div class="teex_spent left-teex">${myCost}</div>
                        <div class="teex_spent right-teex">${oppCost}</div>
                      </div>
                      <div class="status-badge-base status-badge-live">${contest.stake||''}</div>
                      ${contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
                    </div>
                  `;
                })
                .catch(err => {
                  console.error(`Errore punti contest ${contest.contest_id}:`, err);
                  // In fallback uso contest.status_display o 0.0
                  const display = contest.status_display || '0-0';
                  const [m, o] = display.split('-').map(n => parseFloat(n).toFixed(1).split('.'));
                  contestCard.innerHTML = `
                    <div class="contest-container cc-list">
                      <div class="contest-bar">
                        <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
                        <div class="triletter_contest left-name">${myName.substring(0,3)}</div>
                        <div class="result-bignum">
                          <span class="result_bold">${m[0]}</span><span class="win_index_perc">.${m[1]||0}</span>
                          <span class="vs-separator"> </span>
                          <span class="result_bold">${o[0]}</span><span class="win_index_perc">.${o[1]||0}</span>
                        </div>
                        <div class="triletter_contest right-name">${oppName.substring(0,3)}</div>
                        <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                        <div class="teex_spent left-teex">${myCost}</div>
                        <div class="teex_spent right-teex">${oppCost}</div>
                      </div>
                      <div class="status-badge-base status-badge-live">${contest.stake||''}</div>
                      ${contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
                    </div>
                  `;
                });
              break;
 
          // STATUS 5: completato (COMPLETED) → calcolo teex vinti/perduti
          // estraggo fantasy_teams se presenti, altrimenti uso campi fallback
          case 5:
                let myPts = 0, oppPts = 0, myRes = 0, myTeex = 0;
                if (contest.fantasy_teams?.length) {
                  contest.fantasy_teams.forEach(t => {
                    if (t.user_id == userId) {
                      myPts  = parseFloat(t.total_points  || 0);
                      myRes  = parseFloat(t.ft_result      || 0);
                      myTeex = parseFloat(t.ft_teex_won    || 0);
                    } else {
                      oppPts = parseFloat(t.total_points    || 0);
                    }
                  });
                } else {
                  // fallback sui campi owner_/opponent_
                  if (iAmOwner) {
                    myPts  = parseFloat(contest.owner_points   || 0);
                    myRes  = parseFloat(contest.owner_result   || 0);
                    myTeex = parseFloat(contest.owner_teex_won || 0);
                    oppPts = parseFloat(contest.opponent_points|| 0);
                  } else {
                    myPts  = parseFloat(contest.opponent_points   || 0);
                    myRes  = parseFloat(contest.opponent_result   || 0);
                    myTeex = parseFloat(contest.opponent_teex_won || 0);
                    oppPts = parseFloat(contest.owner_points      || 0);
                  }
                }
                // calcolo finale teex vinti/perduti
                const stake    = parseFloat(contest.stake      || 0);
                const cost     = parseFloat(iAmOwner ? contest.owner_cost : contest.opponent_cost|| 0);
                const mult     = parseFloat(contest.multiply   || 1);
                if (myRes === 1)      myTeex = stake - (cost * mult);
                else if (myRes === -1) myTeex = -(cost * mult);
                else                   myTeex = (stake/2) - (cost * mult);
            
                // split punti per visualizzazione
                const [mInt,mDec] = myPts.toFixed(1).split('.');
                const [oInt,oDec] = oppPts.toFixed(1).split('.');
                const badgeClass  = myTeex>0 ? 'status-badge-win'
                                  : myTeex<0 ? 'status-badge-loss'
                                             : 'status-badge-draw';
                const badgeText   = (myTeex>0? '+' : '') + myTeex.toFixed(1);
            
                contestCard.innerHTML = `
                  <div class="contest-container cc-list">
                    <div class="contest-bar">
                      <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
                      <div class="triletter_contest left-name">${myName.substring(0,3)}</div>
                      <div class="result-bignum">
                        <span class="result_bold">${mInt}</span><span class="win_index_perc">.${mDec}</span>
                        <span class="vs-separator"> </span>
                        <span class="result_bold">${oInt}</span><span class="win_index_perc">.${oDec}</span>
                      </div>
                      <div class="triletter_contest right-name">${oppName.substring(0,3)}</div>
                      <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                      <div class="teex_spent left-teex">${cost}</div>
                      <div class="teex_spent right-teex">${iAmOwner? contest.opponent_cost : contest.owner_cost}</div>
                    </div>
                    <div class="status-badge-base ${badgeClass}">${badgeText}</div>
                    ${contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
                  </div>
                `;
                break;
  
  }
      
      // 7) appendo la card al container
      contestCard.addEventListener("click", () => {
        if (contest.status == 1 && !iAmOwner) {
          localStorage.removeItem("chosenPlayers");
          window.location.href = 'riassunto.html';
        } else {
          // Salva i parametri nel localStorage
          localStorage.setItem('contestId', contest.contest_id);
          localStorage.setItem('userId', userId);
          localStorage.setItem('ownerId', contest.owner_id);
          localStorage.setItem('opponentId', contest.opponent_id);
          
          // Naviga alla pagina dei dettagli senza parametri in URL
          window.location.href = 'contest-details.html';
        }
      });

      container.appendChild(contestCard);
    });

    if (!list.length) {
      container.innerHTML = "<p class='no-challenges'>Nessuna sfida</p>";
    }
  }
  export function showActive() {
    document.getElementById("tabActive").innerHTML = '<span class="tab_on">ACTIVE</span>';
    document.getElementById("tabCompleted").innerHTML = '<span class="tab_off">COMPLETED</span>';
    document.getElementById("activeContainer").style.display = "block";
    document.getElementById("completedContainer").style.display = "none";
  }
  
  export function showCompleted() {
    document.getElementById("tabActive").innerHTML = '<span class="tab_off">ACTIVE</span>';
    document.getElementById("tabCompleted").innerHTML = '<span class="tab_on">COMPLETED</span>';
    document.getElementById("activeContainer").style.display = "none";
    document.getElementById("completedContainer").style.display = "block";
  }

  // Carica i dati dell'utente quando la pagina è pronta
  document.addEventListener("DOMContentLoaded", function() {
    loadUserLanding();
    
    // Aggiungi event listener al pulsante NEW GAME
    document.getElementById("playButton").addEventListener("click", function() {
      window.location.href = "scegli-opponent.html";
    });
    
    // Aggiungi event listener ai tab
    document.getElementById("tabActive").addEventListener("click", function() {
      document.getElementById("activeContainer").style.display = "block";
      document.getElementById("completedContainer").style.display = "none";
      document.getElementById("tabActive").querySelector("span").className = "tab_on";
      document.getElementById("tabCompleted").querySelector("span").className = "tab_off";
    });
    
    document.getElementById("tabCompleted").addEventListener("click", function() {
      document.getElementById("activeContainer").style.display = "none";
      document.getElementById("completedContainer").style.display = "block";
      document.getElementById("tabActive").querySelector("span").className = "tab_off";
      document.getElementById("tabCompleted").querySelector("span").className = "tab_on";
    });
    
    // Aggiungi event listener al pulsante Sign Out
    document.getElementById("signOutBtn").addEventListener("click", function() {
      // Rimuovi i dati di autenticazione dal localStorage
      localStorage.removeItem('userId');
      localStorage.removeItem('authToken');
      // Reindirizza alla pagina di login
      window.location.href = "/signin.html";
    });
  });