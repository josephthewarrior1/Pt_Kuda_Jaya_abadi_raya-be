const customerDAO = require('../dao/customerDAO');
const propertyDAO = require('../dao/propertyDAO');
const { sendReminderEmail, getDaysLeft } = require('../src/services/Emailservice');
const { runDailyReminders } = require('../src/cron/reminderCron');

const REMINDER_DAYS = 30;

class ReminderController {

  async sendMyReminder(req, res) {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;

      if (!userEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email belum diset di profil. Update profil dulu untuk mengaktifkan reminder.'
        });
      }

      const [customers, properties] = await Promise.all([
        customerDAO.getAllCustomersByUser(userId),
        propertyDAO.getAllPropertiesByUser(userId),
      ]);

      const vehicleExpiringSoon = customers.filter(c => {
        if (c.status === 'Cancelled') return false;
        const d = getDaysLeft(c.carData?.dueDate);
        return d !== null && d >= 0 && d <= REMINDER_DAYS;
      }).sort((a, b) => getDaysLeft(a.carData?.dueDate) - getDaysLeft(b.carData?.dueDate));

      const vehicleExpired = customers.filter(c => {
        if (c.status === 'Cancelled') return false;
        const d = getDaysLeft(c.carData?.dueDate);
        return d !== null && d < 0;
      });

      const propertyExpiringSoon = properties.filter(p => {
        if (p.status === 'Cancelled') return false;
        const d = getDaysLeft(p.insuranceData?.endDate);
        return d !== null && d >= 0 && d <= REMINDER_DAYS;
      }).sort((a, b) => getDaysLeft(a.insuranceData?.endDate) - getDaysLeft(b.insuranceData?.endDate));

      const propertyExpired = properties.filter(p => {
        if (p.status === 'Cancelled') return false;
        const d = getDaysLeft(p.insuranceData?.endDate);
        return d !== null && d < 0;
      });

      await sendReminderEmail({
        to: userEmail,
        agentName: req.user.fullName || userId,
        expiringSoon: vehicleExpiringSoon,
        expiredItems: vehicleExpired,
        type: 'vehicle',
      });

      if (properties.length > 0) {
        await sendReminderEmail({
          to: userEmail,
          agentName: req.user.fullName || userId,
          expiringSoon: propertyExpiringSoon,
          expiredItems: propertyExpired,
          type: 'property',
        });
      }

      res.status(200).json({
        success: true,
        message: `Reminder dikirim ke ${userEmail}`,
        summary: {
          vehicle: { expiringSoon: vehicleExpiringSoon.length, expired: vehicleExpired.length },
          property: { expiringSoon: propertyExpiringSoon.length, expired: propertyExpired.length },
        }
      });
    } catch (error) {
      console.error('❌ Send reminder error:', error);
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
      console.error('❌ Trigger all reminders error:', error);
      res.status(500).json({ success: false, error: 'Gagal trigger reminders' });
    }
  }

  // Endpoint untuk Vercel Cron — dipanggil otomatis tiap hari jam 08:00 WIB
  async runCron(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

      if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      console.log('⏰ Vercel cron triggered at:', new Date().toLocaleString('id-ID'));
      const result = await runDailyReminders();

      res.status(200).json({
        success: true,
        message: 'Daily reminders completed',
        ...result,
      });
    } catch (error) {
      console.error('❌ Cron job error:', error);
      res.status(500).json({ success: false, error: 'Cron job failed' });
    }
  }
}

module.exports = new ReminderController();