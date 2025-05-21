const express = require('express');
const app = express();

app.get('/api/verify-transaction', async (req, res) => {
  const { transactionRef } = req.query;

  // Replace this with actual API call to verify transaction
  const mockTransactionStatus = {
    transactionRef,
    status: 'SUCCESS', // or 'FAILED', 'PENDING'
  };

  res.json(mockTransactionStatus);
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
