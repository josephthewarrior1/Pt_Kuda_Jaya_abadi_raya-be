const userDAO = require('../../dao/userDAO');
const customerDAO = require('../../dao/customerDAO');
const propertyDAO = require('../../dao/propertyDAO');
const { sendReminderEmail, getDaysLeft } = require('../services/Emailservice');

const filterVehicleItems = (customers) => {
  const expiringSoon = [];
  const expiredItems = [];
  customers.forEach(c => {
    if (c.status === 'Cancelled') return;
    const daysLeft = getDaysLeft(c.carData?.dueDate);
    if (daysLeft === null) return;
    if (daysLeft < 0) expiredItems.push(c);
    else if (daysLeft >= 0 && daysLeft <= 30) expiringSoon.push(c); // ← range 30 hari
  });
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
    if (daysLeft < 0) expiredItems.push(p);
    else if (daysLeft >= 0 && daysLeft <= 30) expiringSoon.push(p); // ← range 30 hari
  });
  expiringSoon.sort((a, b) => getDaysLeft(a.insuranceData?.endDate) - getDaysLeft(b.insuranceData?.endDate));
  return { expiringSoon, expiredItems };
};

const sendRemindersForUser = async (username, user) => {
  if (!user.email) {
    console.log(`⚠️  Skipping ${username} — no email`);
    return;
  }
  console.log(`📧 Processing reminders for: ${username}`);
  try {
    const [customers, properties] = await Promise.all([
      customerDAO.getAllCustomersByUser(username),
      propertyDAO.getAllPropertiesByUser(username),
    ]);
    const vehicleData = filterVehicleItems(customers);
    const propertyData = filterPropertyItems(properties);

    if (vehicleData.expiringSoon.length > 0 || vehicleData.expiredItems.length > 0) {
      await sendReminderEmail({
        to: user.email,
        agentName: user.fullName || username,
        expiringSoon: vehicleData.expiringSoon,
        expiredItems: vehicleData.expiredItems,
        type: 'vehicle',
      });
    }

    if (properties.length > 0 && (propertyData.expiringSoon.length > 0 || propertyData.expiredItems.length > 0)) {
      await sendReminderEmail({
        to: user.email,
        agentName: user.fullName || username,
        expiringSoon: propertyData.expiringSoon,
        expiredItems: propertyData.expiredItems,
        type: 'property',
      });
    }

    console.log(`✅ Done: ${username} (vehicles: ${vehicleData.expiringSoon.length} soon, ${vehicleData.expiredItems.length} expired)`);
  } catch (err) {
    console.error(`❌ Failed for ${username}:`, err.message);
  }
};

const runDailyReminders = async () => {
  console.log('\n🕐 Running daily reminders:', new Date().toLocaleString('id-ID'));
  try {
    const allUsers = await userDAO.getAllUsers();
    const usernames = Object.keys(allUsers);
    console.log(`👥 Found ${usernames.length} users`);
    for (const username of usernames) {
      const user = allUsers[username];
      if (user.role === 'admin') continue;
      await sendRemindersForUser(username, user);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('✅ Daily reminders completed\n');
    return { success: true, usersProcessed: usernames.length };
  } catch (err) {
    console.error('❌ Daily reminder job failed:', err.message);
    throw err;
  }
};

const startReminderCron = () => {
  if (process.env.VERCEL) {
    console.log('⏰ Running on Vercel — cron handled by vercel.json');
    return;
  }
  try {
    const cron = require('node-cron');
    cron.schedule('0 1 * * *', runDailyReminders, { timezone: 'Asia/Jakarta' });
    console.log('⏰ Daily reminder cron scheduled: every day at 08:00 WIB');
  } catch (e) {
    console.log('⚠️  node-cron not available');
  }
};

module.exports = { startReminderCron, runDailyReminders };