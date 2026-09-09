const db = require('../config/db');

exports.unlockContact = async (req, res) => {
  const { initiator_id, target_user_id } = req.body;
  const UNLOCK_COST = 2;
  try {
    const userRes = await db.query('SELECT tokens_balance FROM users WHERE id = $1', [initiator_id]);
    const user = userRes.rows[0];

    if (!user || user.tokens_balance < UNLOCK_COST) {
      return res.status(400).json({ error: 'Solde de jetons insuffisant (2 jetons requis).' });
    }

    await db.query('UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2', [UNLOCK_COST, initiator_id]);
    const targetRes = await db.query('SELECT phone_number FROM users WHERE id = $1', [target_user_id]);

    res.json({
      phone_number: targetRes.rows[0].phone_number,
      remaining_tokens: user.tokens_balance - UNLOCK_COST
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors du déblocage.' });
  }
};

exports.boostProfile = async (req, res) => {
  const { user_id } = req.body;
  const BOOST_COST = 5;
  try {
    const userRes = await db.query('SELECT tokens_balance FROM users WHERE id = $1', [user_id]);
    const user = userRes.rows[0];

    if (!user || user.tokens_balance < BOOST_COST) {
      return res.status(400).json({ error: 'Solde de jetons insuffisant (5 jetons requis).' });
    }

    await db.query("UPDATE users SET tokens_balance = tokens_balance - $1, is_sponsored = TRUE, sponsored_until = NOW() + INTERVAL '1 day' WHERE id = $2", [BOOST_COST, user_id]);

    res.json({ message: 'Profil boosté avec succès pour 24h !', remaining_tokens: user.tokens_balance - BOOST_COST });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors du boost.' });
  }
};
