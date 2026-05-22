const { auth } = require('./config/firebase');
const customerDAO = require('./dao/customerDAO');
const carDAO = require('./dao/carDAO');
const userDAO = require('./dao/userDAO');
const bcrypt = require('bcryptjs');

async function seedData() {
  try {
    const email = 'josep@gmail.com';
    const password = '123456';
    const username = 'josep';

    console.log('Starting seeder script...');

    // 1. Create or get Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('Firebase Auth user found:', userRecord.uid);
      // update password just in case
      await auth.updateUser(userRecord.uid, { password: password });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: email,
          password: password,
          displayName: 'Josep',
        });
        console.log('Firebase Auth user created:', userRecord.uid);
      } else {
        throw e;
      }
    }

    // 2. Create or get Firestore User
    let firestoreUser = await userDAO.findByUsername(username);
    if (!firestoreUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        firestoreUser = await userDAO.createUser({
            username: username,
            email: email,
            password: hashedPassword,
            firebaseUid: userRecord.uid,
            status: 'Active'
        });
        console.log('Firestore user created:', username);
    } else {
        console.log('Firestore user found:', firestoreUser.id);
    }

    // 3. Generate 70 dummy customers
    const totalRecords = 70;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    console.log(`Starting to generate ${totalRecords} dummy records (customers & cars)...`);
    
    for (let i = 1; i <= totalRecords; i++) {
        // Customer
        const customerData = {
            createdBy: username,
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
            createdBy: username,
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

seedData();
