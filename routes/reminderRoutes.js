const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/reminders/send', authMiddleware, (req, res) =>
  reminderController.sendMyReminder(req, res)
);

router.get('/reminders/cron', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return reminderController.runCron(req, res);
});

module.exports = router;
