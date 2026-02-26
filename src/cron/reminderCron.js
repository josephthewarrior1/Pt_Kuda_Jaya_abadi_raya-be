const cron = require('node-cron');
const userDAO = require('../../dao/userDAO');
const customerDAO = require('../../dao/customerDAO');
const propertyDAO = require('../../dao/propertyDAO');
// Di src/cron/reminderCron.js baris 5
const { sendReminderEmail, getDaysLeft } = require('../services/Emailservice');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const REMINDER_DAYS = 30; // ingetin kalau sisa <= 30 hari

const filterVehicleItems = (customers) => {
  const expiringSoon = [];
  const expiredItems = [];

  customers.forEach(c => {
    // Skip kalau Cancelled
    if (c.status === 'Cancelled') return;

    const daysLeft = getDaysLeft(c.carData?.dueDate);
    if (daysLeft === null) return;

    if (daysLeft < 0) {
      expiredItems.push(c);
    } else if (daysLeft <= REMINDER_DAYS) {
      expiringSoon.push(c);
    }
  });

  // Sort by daysLeft ascending
  expiringSoon.sort((a, b) => getDaysLeft(a.carData?.dueDate) - getDaysLeft(b.carData?.dueDate));
  return { expiringSoon, expiredItems };
};

const filterPropertyItems = (properties) => {
  const expiringSoon = [];
  const expiredItems = [];

  properties.forEach(p => {
    if (p.status === 'Cancelled') return;

    const daysLeft = getDaysLeft(p.insuranceData?.endDate);
    if (daysLeft === null) return;

    if (daysLeft < 0) {
      expiredItems.push(p);
    } else if (daysLeft <= REMINDER_DAYS) {
      expiringSoon.push(p);
    }
  });

  expiringSoon.sort((a, b) => getDaysLeft(a.insuranceData?.endDate) - getDaysLeft(b.insuranceData?.endDate));
  return { expiringSoon, expiredItems };
};

// ─── Core: kirim reminder untuk 1 user ───────────────────────────────────────
const sendRemindersForUser = async (username, user) => {
  if (!user.email) {
    console.log(`⚠️  Skipping ${username} — no email`);
    return;
  }

  console.log(`📧 Processing reminders for: ${username}`);

  try {
    // Fetch semua data parallel
    const [customers, properties] = await Promise.all([
      customerDAO.getAllCustomersByUser(username),
      propertyDAO.getAllPropertiesByUser(username),
    ]);

    const vehicleData   = filterVehicleItems(customers);
    const propertyData  = filterPropertyItems(properties);

    // Kirim email kendaraan (selalu kirim biar agent tau statusnya)
    await sendReminderEmail({
      to: user.email,
      agentName: user.fullName || username,
      expiringSoon: vehicleData.expiringSoon,
      expiredItems: vehicleData.expiredItems,
      type: 'vehicle',
    });

    // Kirim email properti hanya kalau ada data properti
    if (properties.length > 0) {
      await sendReminderEmail({
        to: user.email,
        agentName: user.fullName || username,
        expiringSoon: propertyData.expiringSoon,
        expiredItems: propertyData.expiredItems,
        type: 'property',
      });
    }

    console.log(`✅ Done: ${username} (${customers.length} vehicles, ${properties.length} properties)`);
  } catch (err) {
    console.error(`❌ Failed to send reminder for ${username}:`, err.message);
  }
};

// ─── Main: loop semua user ────────────────────────────────────────────────────
const runDailyReminders = async () => {
  console.log('\n🕐 Running daily reminders:', new Date().toLocaleString('id-ID'));

  try {
    const allUsers = await userDAO.getAllUsers();
    const usernames = Object.keys(allUsers);

    console.log(`👥 Found ${usernames.length} users`);

    // Process satu-satu (jangan parallel semua biar ga nge-spam Nodemailer)
    for (const username of usernames) {
      const user = allUsers[username];

      // Skip admin — admin ga punya nasabah
      if (user.role === 'admin') continue;

      await sendRemindersForUser(username, user);

      // Delay 1 detik antar user biar ga kena Gmail rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Daily reminders completed\n');
  } catch (err) {
    console.error('❌ Daily reminder job failed:', err.message);
  }
};

// ─── Schedule ─────────────────────────────────────────────────────────────────
// Jalan setiap hari jam 08:00 WIB (UTC+7 = 01:00 UTC)
// Format: detik menit jam hari-bulan bulan hari-minggu
const startReminderCron = () => {
  // Setiap hari jam 08:00 WIB
  cron.schedule('0 1 * * *', runDailyReminders, {
    timezone: 'Asia/Jakarta'
  });

  console.log('⏰ Daily reminder cron scheduled: every day at 08:00 WIB');
};

module.exports = { startReminderCron, runDailyReminders };