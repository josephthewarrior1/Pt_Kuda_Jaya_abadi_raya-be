const { db } = require('./config/firebase');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const username = 'tester123';
    const password = 'tester123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 1. Create Admin
    await db.collection('admins').doc(username).set({
      username: username,
      password: hashedPassword,
      role: 'superadmin' // Give superadmin so tester has full UI access
    });
    console.log('✅ Admin tester123 created.');

    // 2. Create User (just in case login checks users collection)
    await db.collection('users').doc(username).set({
      id: username,
      username: username,
      password: hashedPassword,
      role: 'superadmin',
      fullName: 'Tester Account',
      createdAt: new Date().toISOString()
    });
    console.log('✅ User tester123 created.');

    // 3. Create a Dummy Customer
    const customerId = 'CUST-001';
    await db.collection('customers').doc(customerId).set({
      id: customerId,
      customerId: customerId,
      fullName: 'Tester Customer 1',
      phone: '081234567890',
      address: 'Jl. Testing Dummy No. 123',
      city: 'Jakarta',
      province: 'DKI',
      ktpNumber: '1234567890123456',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log('✅ Customer CUST-001 created.');

    // 4. Create a Dummy Car with the requested images!
    const carId = 'tester123-car-1';
    await db.collection('cars').doc(carId).set({
      id: carId,
      carId: carId,
      customerId: customerId,
      ownerName: 'Tester Customer 1',
      plateNumber: 'B 1234 TST',
      brand: 'Honda',
      model: 'Brio',
      year: '2022',
      color: 'White',
      machineNumber: 'MHK202212345',
      chasisNumber: 'CHS202212345',
      images: {
        left: {
          url: 'https://res.cloudinary.com/dfxajqmhz/image/upload/v1769219698/car_insurance/customers/tester123-1/tester123-1_left.png',
          uploadedAt: Date.now()
        },
        right: {
          url: 'https://res.cloudinary.com/dfxajqmhz/image/upload/v1769219698/car_insurance/customers/tester123-1/tester123-1_right.png',
          uploadedAt: Date.now()
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'Active'
    });
    console.log('✅ Car tester123-car-1 created with images.');

    // 5. Setup basic counters for future inputs
    await db.collection('counters').doc('customerCount').set({ count: 1 }, { merge: true });
    
    console.log('🎉 Seeding successfully completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
