const userDAO = require('../../dao/userDAO');
const customerDAO = require('../../dao/customerDAO');
const carDAO = require('../../dao/carDAO');
const propertyDAO = require('../../dao/propertyDAO');
const { sendReminderEmail, getDaysLeft } = require('../services/Emailservice');

const REMINDER_DAYS = 30;

const attachCustomerNames = async (userId, items) => {
  const customers = await customerDAO.getAllCustomersByUser(userId);
  const customerNameMap = new Map(customers.map(customer => [customer.id, customer.name || '']));

  return items.map(item => ({
    ...item,
    customerName: customerNameMap.get(item.customerId) || '',
  }));
};

const filterVehicleItems = (cars) => {
  const expiringSoon = [];
  const expiredItems = [];

  cars.forEach(car => {
    if (car.status === 'Cancelled') return;
    const daysLeft = getDaysLeft(car.carData?.dueDate);
    if (daysLeft === null) return;
    if (daysLeft < 0) expiredItems.push(car);
    else if (daysLeft <= REMINDER_DAYS) expiringSoon.push(car);
  });

  expiringSoon.sort((a, b) => getDaysLeft(a.carData?.dueDate) - getDaysLeft(b.carData?.dueDate));
  return { expiringSoon, expiredItems };
};

const filterPropertyItems = (properties) => {
  const expiringSoon = [];
  const expiredItems = [];

  properties.forEach(property => {
    if (property.status === 'Cancelled') return;
    const daysLeft = getDaysLeft(property.insuranceData?.endDate);
    if (daysLeft === null) return;
    if (daysLeft < 0) expiredItems.push(property);
    else if (daysLeft <= REMINDER_DAYS) expiringSoon.push(property);
  });

  expiringSoon.sort((a, b) => getDaysLeft(a.insuranceData?.endDate) - getDaysLeft(b.insuranceData?.endDate));
  return { expiringSoon, expiredItems };
};

const sendRemindersForUser = async (username, user) => {
  if (!user.email) {
    console.log(`Skipping ${username}: no email`);
    return;
  }

  console.log(`Processing reminders for ${username}`);

  try {
    const [cars, properties] = await Promise.all([
      carDAO.getAllCarsByUser(username),
      propertyDAO.getAllPropertiesByUser(username),
    ]);
    const enrichedProperties = await attachCustomerNames(username, properties);

    const vehicleData = filterVehicleItems(cars);
    const propertyData = filterPropertyItems(enrichedProperties);

    if (vehicleData.expiringSoon.length > 0 || vehicleData.expiredItems.length > 0) {
      await sendReminderEmail({
        to: user.email,
        agentName: user.fullName || username,
        expiringSoon: vehicleData.expiringSoon,
        expiredItems: vehicleData.expiredItems,
        type: 'vehicle',
      });
    }

    if (propertyData.expiringSoon.length > 0 || propertyData.expiredItems.length > 0) {
      await sendReminderEmail({
        to: user.email,
        agentName: user.fullName || username,
        expiringSoon: propertyData.expiringSoon,
        expiredItems: propertyData.expiredItems,
        type: 'property',
      });
    }

    console.log(
      `Done ${username}: vehicle ${vehicleData.expiringSoon.length} soon, ${vehicleData.expiredItems.length} expired | property ${propertyData.expiringSoon.length} soon, ${propertyData.expiredItems.length} expired`
    );
  } catch (err) {
    console.error(`Failed for ${username}:`, err.message);
  }
};

const runDailyReminders = async () => {
  console.log('\nRunning daily reminders:', new Date().toLocaleString('id-ID'));

  try {
    const allUsers = await userDAO.getAllUsers();
    const usernames = Object.keys(allUsers);
    console.log(`Found ${usernames.length} users`);

    for (const username of usernames) {
      const user = allUsers[username];
      if (user.role === 'admin') continue;
      await sendRemindersForUser(username, user);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Daily reminders completed\n');
    return { success: true, usersProcessed: usernames.length };
  } catch (err) {
    console.error('Daily reminder job failed:', err.message);
    throw err;
  }
};

const startReminderCron = () => {
  if (process.env.VERCEL) {
    console.log('Running on Vercel: cron handled by vercel.json');
    return;
  }

  try {
    const cron = require('node-cron');
    cron.schedule('0 1 * * *', runDailyReminders, { timezone: 'Asia/Jakarta' });
    console.log('Daily reminder cron scheduled: every day at 08:00 WIB');
  } catch (error) {
    console.log('node-cron not available');
  }
};

module.exports = { startReminderCron, runDailyReminders };
