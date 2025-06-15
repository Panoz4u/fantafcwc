function updateUserBalance(connection, userId, totalCost, multiplier, callback) {
    const finalCost = parseFloat(totalCost) * parseFloat(multiplier);
  
    if (isNaN(finalCost)) {
      console.error('Errore: finalCost non è un numero valido.', { totalCost, multiplier });
      return callback(new Error('Costo finale non valido'));
    }
  
    const sqlUser = `
      UPDATE users
      SET teex_balance = teex_balance - ?
      WHERE user_id = ? AND teex_balance >= ?
    `;
  
    connection.query(sqlUser, [finalCost, userId, finalCost], (err, result) => {
      if (err) {
        console.error("Errore DB nell'aggiornamento del saldo Teex:", err);
        return callback(err);
      }
  
      if (result.affectedRows === 0) {
        console.error(`Saldo Teex insufficiente per userId: ${userId} o utente non trovato.`);
        return callback(new Error('Saldo Teex insufficiente o utente non trovato'));
      }
  
      callback(null);
    });
  }
  
  module.exports = { updateUserBalance };