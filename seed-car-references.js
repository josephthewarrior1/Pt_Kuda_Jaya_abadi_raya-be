require('dotenv').config();
const { db } = require('./config/firebase');

const carReferences = {
    'Toyota': ['Avanza', 'Innova', 'Fortuner', 'Alphard', 'Veloz', 'Rush', 'Agya', 'Calya', 'Raize', 'Yaris', 'Vios', 'Camry', 'Corolla Cross'],
    'Honda': ['Brio', 'HR-V', 'CR-V', 'BR-V', 'City', 'Civic', 'Mobilio', 'Accord', 'WR-V'],
    'Daihatsu': ['Xenia', 'Terios', 'Ayla', 'Sigra', 'Rocky', 'Gran Max', 'Sirion', 'Luxio'],
    'Suzuki': ['Ertiga', 'XL7', 'Ignis', 'Baleno', 'Jimny', 'S-Presso', 'Carry', 'APV'],
    'Mitsubishi': ['Xpander', 'Xpander Cross', 'Pajero Sport', 'Triton', 'L300', 'Outlander'],
    'Nissan': ['Livina', 'Serena', 'X-Trail', 'Magnite', 'Kicks', 'Terra'],
    'Wuling': ['Confero', 'Cortez', 'Almaz', 'Air EV', 'BinguoEV', 'Alvez'],
    'Hyundai': ['Creta', 'Stargazer', 'Palisade', 'Santa Fe', 'Ioniq 5', 'Ioniq 6'],
    'Kia': ['Sonet', 'Seltos', 'Carens', 'Carnival'],
    'Mazda': ['Mazda2', 'Mazda3', 'CX-3', 'CX-5', 'CX-8', 'CX-9'],
    'Isuzu': ['Panther', 'MU-X', 'D-Max', 'Elf', 'Traga'],
    'Ford': ['Everest', 'Ranger', 'Fiesta', 'EcoSport'],
    'Chevrolet': ['Spin', 'Trax', 'Captiva', 'Colorado'],
    'BMW': ['X1', 'X3', 'X5', 'Series 3', 'Series 5'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'GLA', 'GLC', 'GLE']
};

async function seedReferences() {
    console.log('🔄 Seeding Car References...');

    try {
        const ref = db.ref('car_references');
        const updates = {};

        Object.keys(carReferences).forEach(brand => {
            updates[`${brand}/_brandExists`] = true;
            carReferences[brand].forEach(model => {
                updates[`${brand}/${model}`] = true;
            });
        });

        await ref.update(updates);
        console.log(`✅ Update done: Successfully seeded ${Object.keys(carReferences).length} brands.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
}

seedReferences();
