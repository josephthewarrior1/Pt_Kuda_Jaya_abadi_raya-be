require('dotenv').config();
const { db } = require('./config/firebase');

async function migrateData() {
    console.log('🔄 Starting Database Migration...');
    console.log('📌 Reading from: customer_data → Writing to: car_data');

    try {
        // ✅ Corrected: use actual Firebase node names
        const customerDataRef = db.ref('customer_data');
        const carDataRef = db.ref('car_data');
        const carCounterRef = db.ref('car_counters');
        const propertyDataRef = db.ref('property_data');

        const [customersSnapshot, propertiesSnapshot] = await Promise.all([
            customerDataRef.once('value'),
            propertyDataRef.once('value')
        ]);

        const customersData = customersSnapshot.val();
        const propertiesData = propertiesSnapshot.val();

        if (!customersData) {
            console.log('⚠️ No customers found in customer_data.');
            return;
        }

        console.log('==============================================');
        console.log('📦 Phase 1: Migrating carData from customer_data → car_data...');
        let carMigrationCount = 0;

        for (const userId in customersData) {
            const userCustomers = customersData[userId];
            let nextCarNumber = 1;
            const carsToWrite = {};
            const customerCleanups = {};

            for (const customerId in userCustomers) {
                const customer = userCustomers[customerId];

                if (customer.carData && Object.keys(customer.carData).length > 0 &&
                    (customer.carData.carBrand || customer.carData.plateNumber)) {

                    const carId = `${userId}-CAR-${nextCarNumber.toString().padStart(4, '0')}`;
                    nextCarNumber++;

                    // Build the new car object — store carData flat for carDAO compatibility
                    const newCar = {
                        id: carId,
                        customerId: customerId,
                        carData: {
                            ownerName: customer.carData.ownerName || '',
                            carBrand: customer.carData.carBrand || '',
                            carModel: customer.carData.carModel || '',
                            plateNumber: customer.carData.plateNumber || '',
                            chassisNumber: customer.carData.chassisNumber || '',
                            engineNumber: customer.carData.engineNumber || '',
                            dueDate: customer.carData.dueDate || null,
                            carPrice: customer.carData.carPrice || 0
                        },
                        documentStatus: customer.documentStatus || {
                            hasSTNK: false, hasSIM: false, hasKTP: false
                        },
                        carPhotos: customer.carPhotos || {
                            leftSide: '', rightSide: '', front: '', back: ''
                        },
                        documentPhotos: customer.documentPhotos || {
                            stnk: '', sim: '', ktp: ''
                        },
                        status: customer.status || 'Active',
                        notes: customer.notes || '',
                        createdBy: userId,
                        createdAt: customer.createdAt || Date.now(),
                        updatedAt: customer.updatedAt || Date.now()
                    };

                    carsToWrite[carId] = newCar;
                    carMigrationCount++;

                    // Clean up embedded car data from customer
                    const cleanCustomer = { ...customer };
                    delete cleanCustomer.carData;
                    delete cleanCustomer.documentStatus;
                    delete cleanCustomer.carPhotos;
                    delete cleanCustomer.documentPhotos;
                    customerCleanups[customerId] = cleanCustomer;

                    console.log(`  ↳ Migrated: ${customerId} → ${carId} (${customer.carData.carBrand} ${customer.carData.carModel || ''})`);
                }
            }

            // Write cars to car_data/{userId}/
            if (Object.keys(carsToWrite).length > 0) {
                await carDataRef.child(userId).update(carsToWrite);
                // Set car counter
                await carCounterRef.child(userId).set(nextCarNumber - 1);
                console.log(`  ✅ Saved ${Object.keys(carsToWrite).length} cars for user: ${userId}`);
            }

            // Clean up customer nodes
            if (Object.keys(customerCleanups).length > 0) {
                await customerDataRef.child(userId).update(customerCleanups);
                console.log(`  ✅ Cleaned ${Object.keys(customerCleanups).length} customers for user: ${userId}`);
            }
        }

        console.log(`\n✅ Phase 1 done: ${carMigrationCount} cars migrated.`);

        console.log('==============================================');
        console.log('📦 Phase 2: Linking property_data to customerId...');

        if (!propertiesData) {
            console.log('⚠️ No properties found to migrate.');
        } else {
            let propertyMigrationCount = 0;
            let propertySkipCount = 0;

            for (const userId in propertiesData) {
                const userProperties = propertiesData[userId];
                const propertyUpdates = {};

                for (const propertyId in userProperties) {
                    const property = userProperties[propertyId];

                    // Skip if already has customerId
                    if (property.customerId) {
                        propertySkipCount++;
                        continue;
                    }

                    if (!property.ownerName) {
                        propertySkipCount++;
                        continue;
                    }

                    // Try to match property ownerName to a customer name
                    let matchedCustomerId = null;
                    if (customersData[userId]) {
                        const matchedEntry = Object.entries(customersData[userId])
                            .find(([_, c]) => c.name && c.name.toLowerCase() === property.ownerName.toLowerCase());

                        if (matchedEntry) {
                            matchedCustomerId = matchedEntry[0];
                        }
                    }

                    const cleanProperty = { ...property };
                    if (matchedCustomerId) {
                        cleanProperty.customerId = matchedCustomerId;
                        console.log(`  ↳ Matched: ${propertyId} (${property.ownerName}) → ${matchedCustomerId}`);
                    } else {
                        cleanProperty.customerId = 'UNMATCHED';
                        cleanProperty.originalOwnerName = property.ownerName;
                        console.log(`  ⚠️ Unmatched: ${propertyId} (${property.ownerName}) → marked UNMATCHED`);
                    }

                    // Remove old owner fields
                    delete cleanProperty.ownerName;
                    delete cleanProperty.ownerPhone;
                    delete cleanProperty.ownerEmail;
                    delete cleanProperty.ownerAddress;

                    propertyUpdates[propertyId] = cleanProperty;
                    propertyMigrationCount++;
                }

                if (Object.keys(propertyUpdates).length > 0) {
                    await propertyDataRef.child(userId).update(propertyUpdates);
                    console.log(`  ✅ Updated ${Object.keys(propertyUpdates).length} properties for user: ${userId}`);
                }
            }

            console.log(`\n✅ Phase 2 done: ${propertyMigrationCount} properties updated, ${propertySkipCount} skipped.`);
        }

        console.log('\n============================================');
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('============================================');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
}

migrateData();
