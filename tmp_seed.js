const { db } = require('./config/firebase');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const username = 'tester123';
    const password = 'tester123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.collection('users').doc(username).set({
      id: username,
      username,
      password: hashedPassword,
      fullName: 'Tester Account',
      createdAt: new Date().toISOString(),
    });
    console.log('User tester123 created.');

    const customerId = 'CUST-001';
    await db.collection('customers').doc(customerId).set({
      id: customerId,
      customerId,
      fullName: 'Tester Customer 1',
      phone: '081234567890',
      address: 'Jl. Testing Dummy No. 123',
      city: 'Jakarta',
      province: 'DKI',
      ktpNumber: '1234567890123456',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    console.log('Customer CUST-001 created.');

    const carId = 'tester123-car-1';
    await db.collection('cars').doc(carId).set({
      id: carId,
      carId,
      customerId,
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
          uploadedAt: Date.now(),
        },
        right: {
          url: 'https://res.cloudinary.com/dfxajqmhz/image/upload/v1769219698/car_insurance/customers/tester123-1/tester123-1_right.png',
          uploadedAt: Date.now(),
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'Active',
    });
    console.log('Car tester123-car-1 created with images.');

    await db.collection('counters').doc('customerCount').set({ count: 1 }, { merge: true });

    console.log('Seeding successfully completed!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
