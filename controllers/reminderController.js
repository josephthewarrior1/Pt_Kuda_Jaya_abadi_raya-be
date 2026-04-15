const carDAO = require('../dao/carDAO');
const { sendReminderEmail, getDaysLeft } = require('../src/services/Emailservice');
const { runDailyReminders } = require('../src/cron/reminderCron');

const REMINDER_DAYS = 30;

class ReminderController {
  async sendMyReminder(req, res) {
    try {
      const userId = req.user.username;
      const userEmail = req.user.email;

      if (!userEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email belum diset di profil. Update profil dulu untuk mengaktifkan reminder.'
        });
      }

      const cars = await carDAO.getAllCarsByUser(userId);

      const vehicleExpiringSoon = cars.filter(car => {
        if (car.status === 'Cancelled') return false;
        const daysLeft = getDaysLeft(car.carData?.dueDate);
        return daysLeft !== null && daysLeft >= 0 && daysLeft <= REMINDER_DAYS;
      }).sort((a, b) => getDaysLeft(a.carData?.dueDate) - getDaysLeft(b.carData?.dueDate));

      const vehicleExpired = cars.filter(car => {
        if (car.status === 'Cancelled') return false;
        const daysLeft = getDaysLeft(car.carData?.dueDate);
        return daysLeft !== null && daysLeft < 0;
      });

      await sendReminderEmail({
        to: userEmail,
        agentName: req.user.fullName || userId,
        expiringSoon: vehicleExpiringSoon,
        expiredItems: vehicleExpired,
        type: 'vehicle',
      });

      res.status(200).json({
        success: true,
        message: `Reminder dikirim ke ${userEmail}`,
        summary: {
          vehicle: { expiringSoon: vehicleExpiringSoon.length, expired: vehicleExpired.length },
        }
      });
    } catch (error) {
      console.error('Send reminder error:', error);
      res.status(500).json({ success: false, error: 'Gagal mengirim reminder' });
    }
  }

  async triggerAllReminders(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: 'Reminder job started. Cek console untuk progress.'
      });
      runDailyReminders().catch(console.error);
    } catch (error) {
      console.error('Trigger all reminders error:', error);
      res.status(500).json({ success: false, error: 'Gagal trigger reminders' });
    }
  }

  async runCron(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

      if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      console.log('Vercel cron triggered at:', new Date().toLocaleString('id-ID'));
      const result = await runDailyReminders();

      res.status(200).json({
        success: true,
        message: 'Daily reminders completed',
        ...result,
      });
    } catch (error) {
      console.error('Cron job error:', error);
      res.status(500).json({ success: false, error: 'Cron job failed' });
    }
  }
}

module.exports = new ReminderController();
