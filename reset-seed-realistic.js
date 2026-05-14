const { admin, auth, db } = require('./config/firebase');
const customerDAO = require('./dao/customerDAO');
const carDAO = require('./dao/carDAO');
const userDAO = require('./dao/userDAO');
const bcrypt = require('bcryptjs');

// Nama orang biasa campuran Jawa, Sunda, Batak, Chindo - bukan artis
const REALISTIC_NAMES = [
  "Budi Hartono", "Siti Rahayu", "Agus Setiawan", "Dwi Lestari", "Hendra Pranata",
  "Yuni Astuti", "Riko Saputra", "Linda Wati", "Teguh Santoso", "Sari Dewi",
  "Jimmy Gunawan", "Angela Susanto", "Dodi Kusuma", "Fitri Handayani", "Ridwan Maulana",
  "Evi Nuraini", "Freddy Tanaka", "Mira Sanjaya", "Wahyu Prabowo", "Nining Rahmawati",
  "Kevin Lim", "Christine Halim", "Eko Wiyono", "Rini Susilowati", "Hardy Chandra",
  "Yeni Marlina", "Andri Kurniawan", "Sumiati", "Felix Sutanto", "Novita Sari",
  "Bambang Sudirman", "Endang Purwanti", "Ronaldo Tanjung", "Sri Wahyuni", "Denny Pratama",
  "Mega Wulandari", "Surya Dinata", "Ratna Ayu", "Wilson Wijaya", "Tuti Rahayu",
  "Irwan Syahputra", "Lia Permatasari", "Bernard Sirait", "Wati Simanjuntak", "Rizal Fahmi",
  "Neni Sulastri", "Chandra Effendi", "Rosmawati", "Guntur Hidayat", "Sinta Permata",
  "Rudy Halim", "Lenny Santoso", "Yusuf Harahap", "Nanda Pertiwi", "Aris Budiman",
  "Susanti Wijaya", "Benhard Sitompul", "Marlina Pasaribu", "Iwan Setiabudi", "Diana Putri",
  "Anton Kusuma", "Lidia Tanujaya", "Rofiq Anshori", "Tuty Indrayani", "Stevanus Lie",
  "Naomi Hutabarat", "Joko Susilo", "Yanti Oktavia", "Halim Perdanakusuma", "Mia Rachmawati"
];

const STREETS = [
  "Jl. Mangga Besar Raya No. {n}, Jakarta Barat",
  "Jl. Kelapa Gading Timur No. {n}, Jakarta Utara",
  "Jl. Raya Bogor No. {n}, Depok",
  "Jl. Cipinang Muara No. {n}, Jakarta Timur",
  "Jl. Pondok Indah No. {n}, Jakarta Selatan",
  "Jl. Gatot Subroto No. {n}, Bandung",
  "Jl. Pemuda No. {n}, Semarang",
  "Jl. Raya Darmo No. {n}, Surabaya",
  "Jl. Imam Bonjol No. {n}, Medan",
  "Jl. Sam Ratulangi No. {n}, Makassar",
  "Jl. Diponegoro No. {n}, Yogyakarta",
  "Jl. Ahmad Yani No. {n}, Bekasi",
  "Jl. Cikini Raya No. {n}, Jakarta Pusat",
  "Jl. Panjang No. {n}, Kebon Jeruk, Jakarta Barat",
  "Jl. Thamrin No. {n}, Tangerang Selatan",
  "Jl. Raya Serpong No. {n}, Tangerang",
  "Jl. Kertajaya No. {n}, Surabaya",
  "Jl. Setia Budi No. {n}, Bandung",
  "Jl. Urip Sumoharjo No. {n}, Makassar",
  "Jl. Gajah Mada No. {n}, Pontianak"
];

async function resetAndSeed() {
  try {
    const targetUsername = 'testing123456';
    const targetEmail = 'testing123456@gmail.com';
    const targetPassword = '123456';

    console.log('--- STARTING CLEANUP ---');

    // 1. Delete old cars
    const oldCars = await carDAO.getAllCarsByUser(targetUsername);
    for (const car of oldCars) {
        await carDAO.deleteCar(car.id, targetUsername);
    }
    console.log(`Deleted ${oldCars.length} cars from user ${targetUsername}`);

    // 2. Delete old customers
    const oldCustomers = await customerDAO.getAllCustomersByUser(targetUsername);
    for (const customer of oldCustomers) {
        await customerDAO.deleteCustomer(customer.id, targetUsername);
    }
    console.log(`Deleted ${oldCustomers.length} customers from user ${targetUsername}`);

    // Kita ga perlu delete user-nya, cukup pakai user yang udah ada
    console.log('--- STARTING SEEDING DENGAN NAMA REALISTIS ---');

    // Pastikan auth user ada
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(targetEmail);
      console.log('Firebase Auth user found:', userRecord.uid);
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
        userRecord = await auth.createUser({
          email: targetEmail,
          password: targetPassword,
          displayName: 'Testing 123456',
        });
        console.log('Firebase Auth user created:', userRecord.uid);
      } else {
        throw e;
      }
    }

    // Pastikan firestore user ada
    let firestoreUser = await userDAO.findByUsername(targetUsername);
    if (!firestoreUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(targetPassword, salt);
        firestoreUser = await userDAO.createUser({
            username: targetUsername,
            email: targetEmail,
            password: hashedPassword,
            firebaseUid: userRecord.uid,
            role: 'admin',
            status: 'Active'
        });
        console.log('Firestore user created:', targetUsername);
    }

    // 3. Generate 70 dummy customers dengan nama realistis
    const totalRecords = 70;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    console.log(`Starting to generate ${totalRecords} records (customers & cars) for ${targetUsername}...`);
    
    for (let i = 1; i <= totalRecords; i++) {
        // Ambil nama & alamat dari array agar bervariasi
        const nameIndex = (i - 1) % REALISTIC_NAMES.length;
        const streetIndex = (i - 1) % STREETS.length;
        const customerName = REALISTIC_NAMES[nameIndex];
        const houseNumber = 10 + (i * 3); // nomor rumah beda-beda
        const address = STREETS[streetIndex].replace('{n}', houseNumber);
        
        // Customer
        const customerData = {
            createdBy: targetUsername,
            name: customerName,
            email: `${customerName.toLowerCase().replace(/\s/g, '.')}@gmail.com`,
            phone: `08${['11','12','13','21','22','51','52','55','56','57','58'][i % 11]}${Math.floor(10000000 + Math.random() * 89999999)}`,
            address: address,
            notes: '',
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
            createdBy: targetUsername,
            customerId: customer.id,
            carData: {
                ownerName: customerData.name,
                carBrand: i % 3 === 0 ? 'Toyota' : (i % 3 === 1 ? 'Honda' : 'Hyundai'),
                carModel: i % 3 === 0 ? 'Innova Zenix' : (i % 3 === 1 ? 'HR-V' : 'Ioniq 5'),
                plateNumber: `B ${100 + i} ${customerName.substring(0,2).toUpperCase()}`,
                chassisNumber: `MHF${i}REALCHASSIS${Math.floor(Math.random()*1000)}`,
                engineNumber: `1NZ${i}REALENGINE${Math.floor(Math.random()*1000)}`,
                dueDate: dueDate,
                carPrice: 400000000 + (i * 10000000),
                color: i % 2 === 0 ? 'Hitam' : 'Putih',
                year: (2020 + (i % 4)).toString(),
                startDate: new Date(now - (365 * oneDay)).toISOString().split('T')[0],
                insuranceProvider: 'BCA Insurance',
                insuranceType: 'All Risk'
            },
            status: status,
            notes: `Polis atas nama ${customerName} - ${status}`
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
