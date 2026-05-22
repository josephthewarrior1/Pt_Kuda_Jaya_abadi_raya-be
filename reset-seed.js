const { auth } = require('./config/firebase');
const customerDAO = require('./dao/customerDAO');
const carDAO = require('./dao/carDAO');
const userDAO = require('./dao/userDAO');
const bcrypt = require('bcryptjs');

async function resetAndSeed() {
  try {
    const oldUsername = 'josep';
    const oldEmail = 'josep@gmail.com';
    
    // The new user details
    const newEmail = 'testing123456@gmail.com'; // Using @gmail.com to ensure Firebase Auth accepts it as a valid email
    const newPassword = '123456';
    const newUsername = 'testing123456';

    console.log('--- STARTING CLEANUP ---');

    // 1. Delete old cars
    const oldCars = await carDAO.getAllCarsByUser(oldUsername);
    for (const car of oldCars) {
        await carDAO.deleteCar(car.id, oldUsername);
    }
    console.log(`Deleted ${oldCars.length} cars from user ${oldUsername}`);

    // 2. Delete old customers
    const oldCustomers = await customerDAO.getAllCustomersByUser(oldUsername);
    for (const customer of oldCustomers) {
        await customerDAO.deleteCustomer(customer.id, oldUsername);
    }
    console.log(`Deleted ${oldCustomers.length} customers from user ${oldUsername}`);

    // 3. Delete old Firestore user
    try {
        await userDAO.deleteUser(oldUsername);
        console.log(`Deleted Firestore user ${oldUsername}`);
    } catch (e) {
        console.log('Error deleting Firestore user, might not exist.');
    }

    // 4. Delete old Firebase Auth user
    try {
        const oldUserRecord = await auth.getUserByEmail(oldEmail);
        await auth.deleteUser(oldUserRecord.uid);
        console.log(`Deleted Firebase Auth user ${oldEmail}`);
    } catch (e) {
        console.log('Error deleting Firebase Auth user, might not exist.');
    }


    console.log('--- STARTING SEEDING FOR NEW USER ---');

    // 1. Create or get Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(newEmail);
      console.log('Firebase Auth user found:', userRecord.uid);
      await auth.updateUser(userRecord.uid, { password: newPassword });
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
        userRecord = await auth.createUser({
          email: newEmail,
          password: newPassword,
          displayName: 'Testing 123456',
        });
        console.log('Firebase Auth user created:', userRecord.uid);
      } else {
        throw e;
      }
    }

    // 2. Create or get Firestore User
    let firestoreUser = await userDAO.findByUsername(newUsername);
    if (!firestoreUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        firestoreUser = await userDAO.createUser({
            username: newUsername,
            email: newEmail,
            password: hashedPassword,
            firebaseUid: userRecord.uid,
            status: 'Active'
        });
        console.log('Firestore user created:', newUsername);
    } else {
        console.log('Firestore user found:', firestoreUser.id);
    }

    // 3. Generate 70 dummy customers
    const totalRecords = 70;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    console.log(`Starting to generate ${totalRecords} dummy records (customers & cars) for ${newUsername}...`);
    
    for (let i = 1; i <= totalRecords; i++) {
        // Customer
        const customerData = {
            createdBy: newUsername,
            name: `Customer Dummy ${i}`,
            email: `customer${i}@dummy.com`,
            phone: `081234567${i.toString().padStart(3, '0')}`,
            address: `Jl. Dummy No. ${i}, Jakarta`,
            notes: `Dummy note ${i}`,
            status: 'Active'
        };
        
        const customer = await customerDAO.createCustomer(customerData);
        
        // Car
        // Half active (not expired), half expired
        const isExpired = i % 2 === 0; 
        const status = isExpired ? 'Expired' : 'Active';
        
        // Set due date: expired is in the past, active is in the future
        const dueDate = isExpired 
            ? new Date(now - (i * oneDay)).toISOString().split('T')[0] // Past
            : new Date(now + (i * oneDay)).toISOString().split('T')[0]; // Future
            
        const carData = {
            createdBy: newUsername,
            customerId: customer.id,
            carData: {
                ownerName: customerData.name,
                carBrand: i % 3 === 0 ? 'Toyota' : (i % 3 === 1 ? 'Honda' : 'Suzuki'),
                carModel: i % 3 === 0 ? 'Avanza' : (i % 3 === 1 ? 'Brio' : 'Ertiga'),
                plateNumber: `B ${1000 + i} DUM`,
                chassisNumber: `MHF${i}DUMMYCHASSIS`,
                engineNumber: `1NZ${i}DUMMYENGINE`,
                dueDate: dueDate,
                carPrice: 150000000 + (i * 1000000),
                color: i % 2 === 0 ? 'Hitam' : 'Putih',
                year: (2015 + (i % 8)).toString(),
                startDate: new Date(now - (365 * oneDay)).toISOString().split('T')[0],
                insuranceProvider: 'ACA',
                insuranceType: 'All Risk'
            },
            status: status,
            notes: `Dummy car ${i} - ${status}`
        };
        
        await carDAO.createCar(carData);
        
        if (i % 10 === 0) {
            console.log(`Generated ${i}/${totalRecords} records...`);
        }
    }
    
    console.log('Dummy data generation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating dummy data:', error);
    process.exit(1);
  }
}

resetAndSeed();
