// Importa le dipendenze necessarie
const express = require('express');
const router = express.Router();
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

// Utilizza la stessa configurazione del database di index.js
const pool = require("../db");

// Middleware per il parsing del corpo delle richieste
router.use(bodyParser.json({ limit: '10mb' }));
router.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Endpoint per l'upload delle quotazioni
router.post('/api/quotazioni/upload', async (req, res) => {
  const { quotazioni } = req.body;
  
  if (!quotazioni || !Array.isArray(quotazioni) || quotazioni.length === 0) {
    return res.status(400).json({ success: false, error: 'Dati non validi o mancanti' });
  }
  
  console.log(`Ricevute ${quotazioni.length} quotazioni da elaborare`);
  
  let updated = 0;
  let created = 0;
  let errors = 0;
  
  try {
    // Elabora ogni quotazione
    for (const item of quotazioni) {
      // Verifica che i campi obbligatori siano presenti
      if (!item.athlete_id || !item.event_unit_id) {
        console.error('Dati mancanti:', item);
        errors++;
        continue;
      }
      
      // Normalizza i valori
      const athleteId = parseInt(item.athlete_id);
      const eventUnitId = parseInt(item.event_unit_id);
      const isEnded = item.is_ended !== undefined ? parseInt(item.is_ended) : 0;
      const eventUnitCost = parseFloat(String(item.event_unit_cost).replace(',', '.'));
      const status = item.status !== undefined ? parseInt(item.status) : 1;
      
      // Verifica se esiste già una combinazione athlete_id e event_unit_id
      const checkResult = await queryPromise(
        'SELECT aep_id FROM athlete_eventunit_participation WHERE athlete_id = ? AND event_unit_id = ?',
        [athleteId, eventUnitId]
      );
      
      if (checkResult.length > 0) {
        // Aggiorna il record esistente
        await queryPromise(
          `UPDATE athlete_eventunit_participation 
           SET is_ended = ?, event_unit_cost = ?, status = ?, updated_at = NOW() 
           WHERE athlete_id = ? AND event_unit_id = ?`,
          [isEnded, eventUnitCost, status, athleteId, eventUnitId]
        );
        updated++;
      } else {
        // Crea un nuovo record
        await queryPromise(
          `INSERT INTO athlete_eventunit_participation 
           (athlete_id, event_unit_id, is_ended, event_unit_cost, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [athleteId, eventUnitId, isEnded, eventUnitCost, status]
        );
        created++;
      }
    }
    
    // Verifica le sfide in status 2 con almeno un fantasy_team con almeno una fantasy_team_entities con is_ended = 1
    console.log(`[DEBUG] Inizio verifica sfide da aggiornare...`);
    const contestsToUpdate = await queryPromise(`
      SELECT DISTINCT c.contest_id, c.stake, c.multiply, c.status
      FROM contests c
      JOIN fantasy_teams ft ON c.contest_id = ft.contest_id
      JOIN fantasy_team_entities fte ON ft.fantasy_team_id = fte.fantasy_team_id
      JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
      WHERE c.status = 2 AND aep.is_ended = 1
    `);
    
    console.log(`[DEBUG] Trovate ${contestsToUpdate.length} sfide da aggiornare:`, contestsToUpdate.map(c => `${c.contest_id} (status: ${c.status})`));
    
    // Verifica anche le sfide in status 4 che potrebbero essere completate
    console.log(`[DEBUG] Verifica sfide in status 4 che potrebbero essere completate...`);
    const contestsInProgress = await queryPromise(`
      SELECT DISTINCT c.contest_id, c.stake, c.multiply, c.status
      FROM contests c
      JOIN fantasy_teams ft ON c.contest_id = ft.contest_id
      JOIN fantasy_team_entities fte ON ft.fantasy_team_id = fte.fantasy_team_id
      JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
      WHERE c.status = 4
    `);
    
    console.log(`[DEBUG] Trovate ${contestsInProgress.length} sfide in status 4:`, contestsInProgress.map(c => c.contest_id));
    
    // Unisci le due liste di sfide da controllare
    const allContestsToCheck = [...contestsToUpdate];
    for (const contest of contestsInProgress) {
      if (!allContestsToCheck.some(c => c.contest_id === contest.contest_id)) {
        allContestsToCheck.push(contest);
      }
    }
    
    console.log(`[DEBUG] Totale sfide da controllare: ${allContestsToCheck.length}`);
    
    // Aggiorna le sfide trovate
    for (const contest of allContestsToCheck) {
      const { contest_id, stake, multiply, status } = contest;
      
      console.log(`[DEBUG] ==========================================`);
      console.log(`[DEBUG] Elaborazione sfida ID: ${contest_id}, stake: ${stake}, multiply: ${multiply}, status attuale: ${status}`);
      
      // Ottieni i fantasy_team per questa sfida insieme alle informazioni sull'avversario dalla tabella contests
      const teams = await queryPromise(`
        SELECT ft.fantasy_team_id, ft.user_id, ft.ft_status,
               CASE 
                 WHEN ft.user_id = c.owner_user_id THEN c.opponent_user_id 
                 ELSE c.owner_user_id 
               END AS opponent_user_id
        FROM fantasy_teams ft
        JOIN contests c ON ft.contest_id = c.contest_id
        WHERE ft.contest_id = ?
      `, [contest_id]);
      
      console.log(`[DEBUG] Sfida ${contest_id}: trovati ${teams.length} team:`, teams.map(t => `${t.fantasy_team_id} (status: ${t.ft_status})`));
      
      // Verifica se tutti gli atleti di entrambi i team hanno is_ended = 1
      let allEnded = true;
      let teamPoints = {};
      
      for (const team of teams) {
        const { fantasy_team_id, user_id, ft_status } = team;
        
        console.log(`[DEBUG] Analisi team ID: ${fantasy_team_id}, user_id: ${user_id}, ft_status: ${ft_status}`);
        
        // Ottieni tutti gli atleti del team
        const entities = await queryPromise(`
          SELECT fte.fantasy_team_id, fte.aep_id, aep.is_ended, aep.athlete_unit_points, 
                 aep.athlete_id, aep.event_unit_id
          FROM fantasy_team_entities fte
          JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
          WHERE fte.fantasy_team_id = ?
        `, [fantasy_team_id]);
        
        console.log(`[DEBUG] Team ${fantasy_team_id}: trovati ${entities.length} atleti`);
        
        // Calcola i punti totali per questo team
        let totalPoints = 0;
        let hasEndedEntities = false;
        let notEndedCount = 0;
        
        for (const entity of entities) {
          if (entity.is_ended === 1) {
            hasEndedEntities = true;
            totalPoints += parseFloat(entity.athlete_unit_points || 0);
            console.log(`[DEBUG] Atleta AEP_ID: ${entity.aep_id} (athlete_id: ${entity.athlete_id}, event_unit_id: ${entity.event_unit_id}) completato, punti: ${entity.athlete_unit_points}`);
          } else {
            allEnded = false; // Non tutti gli atleti hanno is_ended = 1
            notEndedCount++;
            console.log(`[DEBUG] Atleta AEP_ID: ${entity.aep_id} (athlete_id: ${entity.athlete_id}, event_unit_id: ${entity.event_unit_id}) NON completato, is_ended: ${entity.is_ended}`);
          }
        }
        
        console.log(`[DEBUG] Team ${fantasy_team_id}: ${notEndedCount} atleti non completati, totalPoints: ${totalPoints}, hasEndedEntities: ${hasEndedEntities}, allEnded: ${allEnded}`);
        
        // Aggiorna i punti totali per questo team
        await queryPromise(
          'UPDATE fantasy_teams SET total_points = ? WHERE fantasy_team_id = ?',
          [totalPoints, fantasy_team_id]
        );
        
        teamPoints[fantasy_team_id] = {
          totalPoints,
          team
        };
        
        // Se almeno un atleta ha is_ended = 1, aggiorna lo status del team a 4
        if (hasEndedEntities) {
          console.log(`[DEBUG] Aggiornamento team ${fantasy_team_id} a status 4 (in corso)`);
          await queryPromise(
            'UPDATE fantasy_teams SET ft_status = 4 WHERE fantasy_team_id = ? AND ft_status < 4',
            [fantasy_team_id]
          );
        }
      }
      
      // Se almeno un atleta ha is_ended = 1, aggiorna lo status della sfida a 4
      if (Object.keys(teamPoints).length > 0) {
        console.log(`[DEBUG] Aggiornamento sfida ${contest_id} a status 4 (in corso)`);
        const updateResult = await queryPromise(
          'UPDATE contests SET status = 4 WHERE contest_id = ? AND status = 2',
          [contest_id]
        );
        console.log(`[DEBUG] Risultato aggiornamento sfida ${contest_id} a status 4: righe modificate = ${updateResult.affectedRows}`);
        if (updateResult.affectedRows > 0) {
          contests_updated++;
        }
      }
      
      // Se tutti gli atleti hanno is_ended = 1, aggiorna lo status della sfida a 5
      console.log(`[DEBUG] Sfida ${contest_id}: allEnded = ${allEnded}`);
      if (allEnded) {
        console.log(`[DEBUG] COMPLETAMENTO: Aggiornamento sfida ${contest_id} a status 5 (completata)`);
        
        // Verifica lo stato attuale della sfida prima dell'aggiornamento
        const [currentStatus] = await queryPromise(
          'SELECT status FROM contests WHERE contest_id = ?',
          [contest_id]
        );
        console.log(`[DEBUG] Stato attuale della sfida ${contest_id}: ${currentStatus[0].status}`);
        
        const result = await queryPromise(
          'UPDATE contests SET status = 5 WHERE contest_id = ? AND (status = 2 OR status = 4)',
          [contest_id]
        );
        console.log(`[DEBUG] Risultato aggiornamento sfida ${contest_id} a status 5: righe modificate = ${result.affectedRows}`);
        
        // Aggiorna lo status dei team a 5
        for (const teamId in teamPoints) {
          console.log(`[DEBUG] Aggiornamento team ${teamId} a status 5 (completato)`);
          const teamUpdateResult = await queryPromise(
            'UPDATE fantasy_teams SET ft_status = 5 WHERE fantasy_team_id = ?',
            [teamId]
          );
          console.log(`[DEBUG] Risultato aggiornamento team ${teamId} a status 5: righe modificate = ${teamUpdateResult.affectedRows}`);
        }
        
        // Determina il vincitore e aggiorna ft_result e ft_teex_won
        const teamIds = Object.keys(teamPoints);
        if (teamIds.length === 2) {
          const team1 = teamPoints[teamIds[0]];
          const team2 = teamPoints[teamIds[1]];
          
          console.log(`[DEBUG] Calcolo vincitore tra team ${teamIds[0]} (${team1.totalPoints} punti) e team ${teamIds[1]} (${team2.totalPoints} punti)`);
          
          // Calcola il costo totale per ciascun team
          const team1Cost = await queryPromise(
            'SELECT total_cost FROM fantasy_teams WHERE fantasy_team_id = ?',
            [teamIds[0]]
          );
          
          const team2Cost = await queryPromise(
            'SELECT total_cost FROM fantasy_teams WHERE fantasy_team_id = ?',
            [teamIds[1]]
          );
          
          const team1TotalCost = parseFloat(team1Cost[0].total_cost || 0);
          const team2TotalCost = parseFloat(team2Cost[0].total_cost || 0);
          
          // Determina il risultato
          if (team1.totalPoints > team2.totalPoints) {
            // Team 1 vince
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 1, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [parseFloat(stake) - (team1TotalCost * parseFloat(multiply)), teamIds[0]]
            );
            
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 2, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [-(team2TotalCost * parseFloat(multiply)), teamIds[1]]
            );
            
            // Trasferisci lo stake al vincitore
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake), team1.team.user_id]
            );
          } else if (team1.totalPoints < team2.totalPoints) {
            // Team 2 vince
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 2, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [-(team1TotalCost * parseFloat(multiply)), teamIds[0]]
            );
            
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 1, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [parseFloat(stake) - (team2TotalCost * parseFloat(multiply)), teamIds[1]]
            );
            
            // Trasferisci lo stake al vincitore
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake), team2.team.user_id]
            );
          } else {
            // Pareggio
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 0, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [(parseFloat(stake) / 2) - (team1TotalCost * parseFloat(multiply)), teamIds[0]]
            );
            
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 0, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [(parseFloat(stake) / 2) - (team2TotalCost * parseFloat(multiply)), teamIds[1]]
            );
            
            // Trasferisci metà stake a ciascun giocatore
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake) / 2, team1.team.user_id]
            );
            
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake) / 2, team2.team.user_id]
            );
          }
        }
      }
    }
    
    console.log(`Elaborazione completata: ${updated} aggiornati, ${created} creati, ${errors} errori, ${contests_updated} sfide aggiornate`);
    res.json({ 
      success: true, 
      message: 'Upload risultati completato con successo', 
      updated, 
      created, 
      errors,
      contests_updated
    });
  } catch (error) {
    console.error('Errore durante l\'elaborazione dei risultati:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'elaborazione dei risultati: ' + error.message,
      logs: logMessages
    });
  }
});

// Endpoint per l'upload dei risultati
router.post('/api/risultati/upload', async (req, res) => {
  const { risultati } = req.body;
  
  if (!risultati || !Array.isArray(risultati) || risultati.length === 0) {
    return res.status(400).json({ success: false, error: 'Dati non validi o mancanti' });
  }
  
  console.log(`Ricevute ${risultati.length} risultati da elaborare`);
  
  let updated = 0;
  let created = 0;
  let errors = 0;
  let contests_updated = 0;
  let logMessages = [];
  
  // Funzione per aggiungere log sia alla console che all'array dei messaggi
  function addLog(message) {
    console.log(message);
    logMessages.push(message);
  }

  try {
    // Elabora ogni risultato
    for (const risultato of risultati) {
      // Verifica che i campi obbligatori siano presenti
      if (!risultato.athlete_id || !risultato.event_unit_id) {
        console.error('Dati mancanti:', risultato);
        errors++;
        continue;
      }
      
      // Normalizza i valori
      const athleteId = parseInt(risultato.athlete_id);
      const eventUnitId = parseInt(risultato.event_unit_id);
      const isEnded = risultato.is_ended !== undefined ? parseInt(risultato.is_ended) : 0;
      const status = risultato.status !== undefined ? parseInt(risultato.status) : 0;
      const athleteUnitPoints = risultato.athlete_unit_points !== undefined ? 
        parseFloat(String(risultato.athlete_unit_points).replace(',', '.')) : 0;
      
      // Verifica se esiste già una combinazione athlete_id e event_unit_id
      const checkResult = await queryPromise(
        'SELECT aep_id FROM athlete_eventunit_participation WHERE athlete_id = ? AND event_unit_id = ?',
        [athleteId, eventUnitId]
      );
      
      if (checkResult.length > 0) {
        // Aggiorna il record esistente
        await queryPromise(
          `UPDATE athlete_eventunit_participation 
           SET is_ended = ?, status = ?, athlete_unit_points = ?, updated_at = NOW() 
           WHERE athlete_id = ? AND event_unit_id = ?`,
          [isEnded, status, athleteUnitPoints, athleteId, eventUnitId]
        );
        updated++;
      } else {
        // Crea un nuovo record
        await queryPromise(
          `INSERT INTO athlete_eventunit_participation 
           (athlete_id, event_unit_id, is_ended, status, athlete_unit_points, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [athleteId, eventUnitId, isEnded, status, athleteUnitPoints]
        );
        created++;
      }
    }
    
    // Verifica le sfide in status 2 con almeno un fantasy_team con almeno una fantasy_team_entities con is_ended = 1
    const contestsToUpdate = await queryPromise(`
      SELECT DISTINCT c.contest_id, c.stake, c.multiply
      FROM contests c
      JOIN fantasy_teams ft ON c.contest_id = ft.contest_id
      JOIN fantasy_team_entities fte ON ft.fantasy_team_id = fte.fantasy_team_id
      JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
      WHERE c.status = 2 AND aep.is_ended = 1
    `);
    
    console.log(`[DEBUG] Trovate ${contestsToUpdate.length} sfide da aggiornare:`, contestsToUpdate.map(c => c.contest_id));
    
    // Aggiorna le sfide trovate
    for (const contest of contestsToUpdate) {
      const { contest_id, stake, multiply } = contest;
      
      console.log(`[DEBUG] Elaborazione sfida ID: ${contest_id}, stake: ${stake}, multiply: ${multiply}`);
      
      // Ottieni i fantasy_team per questa sfida insieme alle informazioni sull'avversario dalla tabella contests
      const teams = await queryPromise(`
        SELECT ft.fantasy_team_id, ft.user_id, 
               CASE 
                 WHEN ft.user_id = c.owner_user_id THEN c.opponent_user_id 
                 ELSE c.owner_user_id 
               END AS opponent_user_id
        FROM fantasy_teams ft
        JOIN contests c ON ft.contest_id = c.contest_id
        WHERE ft.contest_id = ?
      `, [contest_id]);
      
      console.log(`[DEBUG] Sfida ${contest_id}: trovati ${teams.length} team:`, teams.map(t => t.fantasy_team_id));
      
      // Verifica se tutti gli atleti di entrambi i team hanno is_ended = 1
      let allEnded = true;
      let teamPoints = {};
      
      for (const team of teams) {
        const { fantasy_team_id, user_id } = team;
        
        console.log(`[DEBUG] Analisi team ID: ${fantasy_team_id}, user_id: ${user_id}`);
        
        // Ottieni tutti gli atleti del team
        const entities = await queryPromise(`
          SELECT fte.fantasy_team_id, fte.aep_id, aep.is_ended, aep.athlete_unit_points
          FROM fantasy_team_entities fte
          JOIN athlete_eventunit_participation aep ON fte.aep_id = aep.aep_id
          WHERE fte.fantasy_team_id = ?
        `, [fantasy_team_id]);
        
        console.log(`[DEBUG] Team ${fantasy_team_id}: trovati ${entities.length} atleti`);
        
        // Calcola i punti totali per questo team
        let totalPoints = 0;
        let hasEndedEntities = false;
        let notEndedCount = 0;
        
        for (const entity of entities) {
          if (entity.is_ended === 1) {
            hasEndedEntities = true;
            totalPoints += parseFloat(entity.athlete_unit_points || 0);
            console.log(`[DEBUG] Atleta AEP_ID: ${entity.aep_id} completato, punti: ${entity.athlete_unit_points}`);
          } else {
            allEnded = false; // Non tutti gli atleti hanno is_ended = 1
            notEndedCount++;
            console.log(`[DEBUG] Atleta AEP_ID: ${entity.aep_id} NON completato`);
          }
        }
        
        console.log(`[DEBUG] Team ${fantasy_team_id}: ${notEndedCount} atleti non completati, totalPoints: ${totalPoints}, hasEndedEntities: ${hasEndedEntities}, allEnded: ${allEnded}`);
        
        // Aggiorna i punti totali per questo team
        await queryPromise(
          'UPDATE fantasy_teams SET total_points = ? WHERE fantasy_team_id = ?',
          [totalPoints, fantasy_team_id]
        );
        
        teamPoints[fantasy_team_id] = {
          totalPoints,
          team
        };
        
        // Se almeno un atleta ha is_ended = 1, aggiorna lo status del team a 4
        if (hasEndedEntities) {
          console.log(`[DEBUG] Aggiornamento team ${fantasy_team_id} a status 4 (in corso)`);
          await queryPromise(
            'UPDATE fantasy_teams SET ft_status = 4 WHERE fantasy_team_id = ?',
            [fantasy_team_id]
          );
        }
      }
      
      // Se almeno un atleta ha is_ended = 1, aggiorna lo status della sfida a 4
      if (Object.keys(teamPoints).length > 0) {
        console.log(`[DEBUG] Aggiornamento sfida ${contest_id} a status 4 (in corso)`);
        await queryPromise(
          'UPDATE contests SET status = 4 WHERE contest_id = ? AND status = 2',
          [contest_id]
        );
        contests_updated++;
      }
      
      // Se tutti gli atleti hanno is_ended = 1, aggiorna lo status della sfida a 5
      console.log(`[DEBUG] Sfida ${contest_id}: allEnded = ${allEnded}`);
      if (allEnded) {
        console.log(`[DEBUG] COMPLETAMENTO: Aggiornamento sfida ${contest_id} a status 5 (completata)`);
        
        // Verifica lo stato attuale della sfida prima dell'aggiornamento
        const [currentStatus] = await queryPromise(
          'SELECT status FROM contests WHERE contest_id = ?',
          [contest_id]
        );
        console.log(`[DEBUG] Stato attuale della sfida ${contest_id}: ${currentStatus[0].status}`);
        
        const result = await queryPromise(
          'UPDATE contests SET status = 5 WHERE contest_id = ? AND (status = 2 OR status = 4)',
          [contest_id]
        );
        console.log(`[DEBUG] Risultato aggiornamento sfida ${contest_id}: righe modificate = ${result.affectedRows}`);
        
        // Aggiorna lo status dei team a 5
        for (const teamId in teamPoints) {
          console.log(`[DEBUG] Aggiornamento team ${teamId} a status 5 (completato)`);
          await queryPromise(
            'UPDATE fantasy_teams SET ft_status = 5 WHERE fantasy_team_id = ?',
            [teamId]
          );
        }
        
        // Determina il vincitore e aggiorna ft_result e ft_teex_won
        const teamIds = Object.keys(teamPoints);
        if (teamIds.length === 2) {
          const team1 = teamPoints[teamIds[0]];
          const team2 = teamPoints[teamIds[1]];
          
          console.log(`[DEBUG] Calcolo vincitore tra team ${teamIds[0]} (${team1.totalPoints} punti) e team ${teamIds[1]} (${team2.totalPoints} punti)`);
          
          // Calcola il costo totale per ciascun team
          const team1Cost = await queryPromise(
            'SELECT total_cost FROM fantasy_teams WHERE fantasy_team_id = ?',
            [teamIds[0]]
          );
          
          const team2Cost = await queryPromise(
            'SELECT total_cost FROM fantasy_teams WHERE fantasy_team_id = ?',
            [teamIds[1]]
          );
          
          const team1TotalCost = parseFloat(team1Cost[0].total_cost || 0);
          const team2TotalCost = parseFloat(team2Cost[0].total_cost || 0);
          
          // Determina il risultato
          if (team1.totalPoints > team2.totalPoints) {
            // Team 1 vince
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 1, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [parseFloat(stake) - (team1TotalCost * parseFloat(multiply)), teamIds[0]]
            );
            
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 2, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [-(team2TotalCost * parseFloat(multiply)), teamIds[1]]
            );
            
            // Trasferisci lo stake al vincitore
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake), team1.team.user_id]
            );
          } else if (team1.totalPoints < team2.totalPoints) {
            // Team 2 vince
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 2, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [-(team1TotalCost * parseFloat(multiply)), teamIds[0]]
            );
            
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 1, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [parseFloat(stake) - (team2TotalCost * parseFloat(multiply)), teamIds[1]]
            );
            
            // Trasferisci lo stake al vincitore
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake), team2.team.user_id]
            );
          } else {
            // Pareggio
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 0, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [(parseFloat(stake) / 2) - (team1TotalCost * parseFloat(multiply)), teamIds[0]]
            );
            
            await queryPromise(
              'UPDATE fantasy_teams SET ft_result = 0, ft_teex_won = ? WHERE fantasy_team_id = ?',
              [(parseFloat(stake) / 2) - (team2TotalCost * parseFloat(multiply)), teamIds[1]]
            );
            
            // Trasferisci metà stake a ciascun giocatore
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake) / 2, team1.team.user_id]
            );
            
            await queryPromise(
              'UPDATE users SET teex_balance = teex_balance + ? WHERE user_id = ?',
              [parseFloat(stake) / 2, team2.team.user_id]
            );
          }
        }
      }
    }
    
    console.log(`Elaborazione completata: ${updated} aggiornati, ${created} creati, ${errors} errori, ${contests_updated} sfide aggiornate`);
    
    // Formatta i log in HTML per la visualizzazione
    const formattedLogs = logMessages.join('<br>');
    
    res.json({ 
      success: true, 
      message: 'Upload risultati completato con successo', 
      updated, 
      created, 
      errors,
      contests_updated,
      logs: logMessages,
      formattedLogs: formattedLogs
    });
  } catch (error) {
    console.error('Errore durante l\'elaborazione dei risultati:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'elaborazione dei risultati: ' + error.message,
      logs: logMessages
    });
  }
});

// Endpoint per l'upload degli extra
router.post('/api/extra/upload', async (req, res) => {
  const { extra } = req.body;
  
  if (!extra || !Array.isArray(extra) || extra.length === 0) {
    return res.status(400).json({ success: false, error: 'Dati non validi o mancanti' });
  }
  
  console.log(`Ricevuti ${extra.length} dati extra da elaborare`);
  
  let updated = 0;
  let created = 0;
  let errors = 0;
  
  try {
    // Implementazione per l'upload degli extra
    // Qui puoi aggiungere la logica specifica per i dati extra
    
    res.json({ 
      success: true, 
      message: 'Upload extra completato con successo', 
      updated, 
      created, 
      errors 
    });
  } catch (error) {
    console.error('Errore durante l\'elaborazione dei dati extra:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'elaborazione dei dati extra: ' + error.message 
    });
  }
});

// Funzione per eseguire query con Promise
function queryPromise(sql, params) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// Esporta il router per essere utilizzato in index.js
module.exports = router;