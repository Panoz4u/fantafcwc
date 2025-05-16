// public/js/user/contests.js
/**
 * @module contests.js
 * Contiene loadUserLanding() e renderContestList() esattamente come prima.
 */

   // Funzioni per gestire le finestre modali
   function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
    document.body.style.overflow = "hidden"; // Impedisce lo scorrimento della pagina sottostante
  }
  
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
  // Ottieni l'ID utente dal localStorage invece che dall'URL
// public/js/user/contests.js

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
      const resp = await fetch('/user-landing-info', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Errore backend:', resp.status, errorText);
        alert('Errore nel caricamento utente.');
        return;
      }
  
      // 4) Leggo i dati JSON
      const data = await resp.json();
      console.log('Dati ricevuti:', data);
    
      // 6) Render delle due liste
      renderContestList(data.active, document.getElementById('activeContainer'));
      renderContestList(data.completed,document.getElementById('completedContainer'));
  
    } catch (err) {
      console.error('Errore in loadUserLanding:', err);
    }
    }
  
  export function renderContestList(list, container){
        // se list non è un array, esci senza crashare
        if (!Array.isArray(list)) {
            console.warn('renderContestList: atteso array, ricevuto', list);
            return;
        }
        // recupero di nuovo userId per poterlo usare anche qui
        const userId = localStorage.getItem('userId');
        container.innerHTML = "";
        // Filter out contests with status 0 (created)
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
      // Replace "Nessuna sfida" with a welcome message and animated arrows
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
    filteredList.forEach(contest => {
      // Correggiamo la determinazione di iAmOwner confrontando correttamente gli ID
      const iAmOwner = parseInt(contest.owner_id) === parseInt(userId);
      console.log(`Contest ${contest.contest_id}: owner_id=${contest.owner_id}, userId=${userId}, iAmOwner=${iAmOwner}`);
      
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

      // Truncate names to 19 characters and add "..." if longer
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
   // Create contest card based on the mockup
      const contestCard = document.createElement("div");
      contestCard.classList.add("contest-cell", "clickable");
      
      // Aggiungi l'ID del contest come attributo data per recuperarlo al click
      contestCard.dataset.contestId = contest.contest_id;
      contestCard.dataset.eventUnitId = contest.event_unit_id || '';
      
      // Aggiungi event listener per il click solo se non è un contest in stato 1 dove sono owner
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
      if (contest.status == 0) {
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
      // Special layout for status 1 contests where I am the owner
      } else if (contest.status == 1 && iAmOwner) {
        // Special layout for status 1 contests where I am the owner
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
            ${contest.multiply && parseInt(contest.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contest.status == 1 && !iAmOwner) {
        // Special layout for invited contests (status 1 where I am NOT the owner)
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
            ${contest.multiply && parseInt(contest.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contest.status == 2) {
        // Special layout for ready contests (status 2)
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
            ${contest.multiply && parseInt(contest.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contest.status == 4) {
        // Special layout for status 4 (in progress) contests
        console.log("Contest status 4:", contest);
        console.log("Status display:", contest.status_display);
        console.log("iAmOwner:", iAmOwner);
        
        // Carica i punteggi aggiornati dal nuovo endpoint
        fetch(`/fantasy/contest-points?contest_id=${contest.contest_id}`)
          .then(response => response.json())
          .then(data => {
            console.log(`Risultati calculateContestPoints per contest ${contest.contest_id}:`, data);
            
            // Valori predefiniti
            let myScore = 0;
            let oppScore = 0;
            
            // Assegna i punteggi in base a se l'utente è owner o opponent
            if (iAmOwner) {
              myScore = parseFloat(data.owner_points || 0);
              oppScore = parseFloat(data.opponent_points || 0);
            } else {
              myScore = parseFloat(data.opponent_points || 0);
              oppScore = parseFloat(data.owner_points || 0);
            }
            
            const myScoreStr = myScore.toFixed(1);
            const oppScoreStr = oppScore.toFixed(1);
            console.log("Score strings:", myScoreStr, oppScoreStr);
            
            const [myScoreInt, myScoreDec = "0"] = myScoreStr.split('.');
            const [oppScoreInt, oppScoreDec = "0"] = oppScoreStr.split('.');
            console.log("Score parts:", myScoreInt, myScoreDec, oppScoreInt, oppScoreDec);
            
            // Aggiorna il contenuto HTML con i nuovi punteggi
            contestCard.innerHTML = `
              <div class="contest-container cc-list">
                <div class="contest-bar">
                  <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div style="position: absolute; top: calc(50% - 14px); left: 50%; transform: translate(-50%, -50%); display: flex; align-items: baseline;">
                    <span class="result_bold" style="position: static; transform: none; color: #fff">${myScoreInt}</span>
                    <span class="win_index_perc" style="color: #fff">.${myScoreDec}</span>
                    <span style="margin: 0 5px; color: white; font-size: 20px;"> </span>
                    <span class="result_bold" style="position: static; transform: none; color: #fff">${oppScoreInt}</span>
                    <span class="win_index_perc" style="color: #fff">.${oppScoreDec}</span>
                  </div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex">${myCost}</div>
                  <div class="teex_spent right-teex">${oppCost}</div>
                </div>
                <div class="status-badge-base status-badge-live">${contest.stake || ''}</div>
                ${contest.multiply && contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
              </div>
            `;
          })
          .catch(error => {
            console.error(`Errore nel recupero dei punti per il contest ${contest.contest_id}:`, error);
            
            // In caso di errore, usa i valori predefiniti o quelli dal status_display
            let myScore = 0;
            let oppScore = 0;
            
            // Estrai i punteggi dal status_display come fallback
            if (contest.status_display && contest.status_display !== "live") {
              const parts = contest.status_display.split('-');
              if (parts.length === 2) {
                myScore = parseFloat(parts[0]) || 0;
                oppScore = parseFloat(parts[1]) || 0;
              }
            }
            
            const myScoreStr = myScore.toFixed(1);
            const oppScoreStr = oppScore.toFixed(1);
            
            const [myScoreInt, myScoreDec = "0"] = myScoreStr.split('.');
            const [oppScoreInt, oppScoreDec = "0"] = oppScoreStr.split('.');
            
            // Aggiorna il contenuto HTML con i punteggi di fallback
            contestCard.innerHTML = `
              <div class="contest-container cc-list">
                <div class="contest-bar">
                  <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div style="position: absolute; top: calc(50% - 14px); left: 50%; transform: translate(-50%, -50%); display: flex; align-items: baseline;">
                    <span class="result_bold" style="position: static; transform: none; color: #fff">${myScoreInt}</span>
                    <span class="win_index_perc" style="color: #fff">.${myScoreDec}</span>
                    <span style="margin: 0 5px; color: white; font-size: 20px;"> </span>
                    <span class="result_bold" style="position: static; transform: none; color: #fff">${oppScoreInt}</span>
                    <span class="win_index_perc" style="color: #fff">.${oppScoreDec}</span>
                  </div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex">${myCost}</div>
                  <div class="teex_spent right-teex">${oppCost}</div>
                </div>
                <div class="status-badge-base status-badge-live">${contest.stake || ''}</div>
                ${contest.multiply && contest.multiply > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
              </div>
            `;
          });
      } else if (contest.status == 5) {
        // Special layout for status 5 (completed) contests
        console.log("Contest status 5:", contest);
        
        // Ottieni i punteggi dai total_points dei fantasy_teams
        let myPoints = 0;
        let oppPoints = 0;
        let myResult = 0;
        let myTeexWon = 0;
        
        // Estrai i dati dai fantasy_teams
        if (contest.fantasy_teams && contest.fantasy_teams.length > 0) {
          contest.fantasy_teams.forEach(team => {
            if (team.user_id == userId) {
              myPoints = parseFloat(team.total_points || 0);
              myResult = parseFloat(team.ft_result || 0);
              myTeexWon = parseFloat(team.ft_teex_won || 0);
            } else {
              oppPoints = parseFloat(team.total_points || 0);
            }
          });
        } else {
          // Fallback se fantasy_teams non è disponibile
          if (iAmOwner) {
            myPoints = parseFloat(contest.owner_points || 0);
            myResult = parseFloat(contest.owner_result || 0);
            myTeexWon = parseFloat(contest.owner_teex_won || 0);
            oppPoints = parseFloat(contest.opponent_points || 0);
          } else {
            myPoints = parseFloat(contest.opponent_points || 0);
            myResult = parseFloat(contest.opponent_result || 0);
            myTeexWon = parseFloat(contest.opponent_teex_won || 0);
            oppPoints = parseFloat(contest.owner_points || 0);
          }
        }
        
        // Formatta i punteggi per la visualizzazione
        const myPointsStr = myPoints.toFixed(1);
        const oppPointsStr = oppPoints.toFixed(1);
        
        const [myPointsInt, myPointsDec = "0"] = myPointsStr.split('.');
        const [oppPointsInt, oppPointsDec = "0"] = oppPointsStr.split('.');
        
        // Calcola il valore corretto dei teex vinti in base alle regole
        const stake = parseFloat(contest.stake || 0);
        const myCost = parseFloat(iAmOwner ? contest.owner_cost : contest.opponent_cost || 0);
        const multiply = parseFloat(contest.multiply || 1);
        
        // Ricalcola i teex vinti in base alle regole specificate
        if (myResult === 1) {
          // Vittoria: stake - (myCost * multiply)
          myTeexWon = stake - (myCost * multiply);
        } else if (myResult === -1) {
          // Sconfitta: -(myCost * multiply)
          myTeexWon = -(myCost * multiply);
        } else {
          // Pareggio: (stake/2) - (myCost * multiply)
          myTeexWon = (stake/2) - (myCost * multiply);
        }
        
        // Determina la classe del badge in base al valore di myTeexWon
        let badgeClass = "status-badge-draw";
        let badgeText = `${myTeexWon.toFixed(1)}`;
        
        if (myTeexWon > 0) {
          badgeClass = "status-badge-win";
          badgeText = `+${myTeexWon.toFixed(1)}`;
        } else if (myTeexWon < 0) {
          badgeClass = "status-badge-loss";
          badgeText = `${myTeexWon.toFixed(1)}`;
        }
        
        contestCard.innerHTML = `
          <div class="contest-container cc-list">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
              <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
              <div style="position: absolute; top: calc(50% - 14px); left: 50%; transform: translate(-50%, -50%); display: flex; align-items: baseline;">
                <span class="result_bold" style="position: static; transform: none; color: #fff">${myPointsInt}</span>
                <span class="win_index_perc" style="color: #fff">.${myPointsDec}</span>
                <span style="margin: 0 5px; color: white; font-size: 20px;"> </span>
                <span class="result_bold" style="position: static; transform: none; color: #fff">${oppPointsInt}</span>
                <span class="win_index_perc" style="color: #fff">.${oppPointsDec}</span>
              </div>
              <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
              <div class="teex_spent left-teex">${myCost}</div>
              <div class="teex_spent right-teex">${oppCost}</div>
            </div>
            <div class="status-badge-base ${badgeClass}">${badgeText}</div>
            ${contest.multiply && parseInt(contest.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contest.multiply)}</div>` : ''}
          </div>
        `;
      } else {
        // Original layout for other contest types
        const vsContainer = document.createElement("div");
        vsContainer.classList.add("vs-container");

        // Left player (current user)
        const leftPlayer = document.createElement("div");
        leftPlayer.classList.add("player-side");
        leftPlayer.innerHTML = `
          <img class="player-avatar" src="${getAvatarSrc(myAvatar)}" alt="${myName}">
          <div class="player-name">${myName.substring(0, 3)}</div>
          <div class="player-score">${myCost}</div>
          ${contest.position_info ? `<div class="player-position">POS:${contest.position_info.my_position || '-'}</div>` : ''}
        `;

        // Middle VS section
        const vsMiddle = document.createElement("div");
        vsMiddle.classList.add("vs-middle");
        vsMiddle.innerHTML = `
          <div class="vs-text">VS</div>
          <div class="contest-status ${statusClass}">${displayedStatus}</div>
          ${contest.stake ? `<div class="contest-stake">${contest.stake}</div>` : ''}
          ${contest.badge_count ? `<div class="badge-number">${contest.badge_count}</div>` : ''}
        `;

        // Right player (opponent)
        const rightPlayer = document.createElement("div");
        rightPlayer.classList.add("player-side");
        rightPlayer.innerHTML = `
          <img class="player-avatar" src="${getAvatarSrc(oppAvatar)}" alt="${oppName}">
          <div class="player-name">${oppName.substring(0, 3)}</div>
          <div class="player-score">${oppCost}</div>
          ${contest.position_info ? `<div class="player-position">POS:${contest.position_info.opp_position || '-'}</div>` : ''}
        `;

        vsContainer.appendChild(leftPlayer);
        vsContainer.appendChild(vsMiddle);
        vsContainer.appendChild(rightPlayer);
        contestCard.appendChild(vsContainer);
      }

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