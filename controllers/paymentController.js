const { FedaPay, Transaction } = require('fedapay');

FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
FedaPay.setEnvironment(process.env.FEDAPAY_ENVIRONMENT);

exports.initiateTokenPurchase = async (req, res) => {
  const { user_id, amount_fcfa, token_count } = req.body;
  try {
    const transaction = await Transaction.create({
      description: `Achat de ${token_count} jetons SEMLINKO`,
      amount: amount_fcfa,
      currency: { iso: 'XOF' },
      callback_url: 'http://localhost:5000',
      customer: {
        firstname: 'Client',
        lastname: 'SEMLINKO',
        email: `user${user_id}@semlinko.bj`
      }
    });

    const token = await transaction.generateToken();
    res.json({ message: 'Transaction créée', payment_url: token.url, transaction_id: transaction.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l initialisation FedaPay.' });
  }
};

exports.handleWebhook = async (req, res) => {
  res.status(200).send('Webhook reçu');
};
