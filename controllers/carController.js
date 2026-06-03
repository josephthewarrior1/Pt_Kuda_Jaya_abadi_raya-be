const carDAO = require('../dao/carDAO');
const carReferenceDAO = require('../dao/carReferenceDAO');
const cloudinary = require('../config/cloudinary');

class CarController {
    // Get car references (brands and models)
    async getCarReferences(req, res) {
        try {
            const references = await carReferenceDAO.getReferences();

            // Format for frontend: [{ brand: 'Toyota', models: ['Avanza', 'Innova'] }]
            const formatted = Object.keys(references).map(brand => {
                const modelsRaw = references[brand];
                let models = [];
                if (typeof modelsRaw === 'object' && modelsRaw !== null) {
                    models = Object.keys(modelsRaw).filter(m => m !== '_brandExists');
                }
                return { brand, models: models.sort() };
            }).sort((a, b) => a.brand.localeCompare(b.brand));

            res.status(200).json({
                success: true,
                references: formatted,
            });
        } catch (error) {
            console.error('❌ Get car references error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching car references',
            });
        }
    }
    // Get all cars (for current user)
    async getAllCars(req, res) {
        try {
            const userId = req.user.username;
            const customerDAO = require('../dao/customerDAO');

            console.log('🚗 Getting all cars for user:', userId);

            const cars = await carDAO.getAllCarsByUser(userId);
            const customers = await customerDAO.getAllCustomersByUser(userId);

            const customerMap = {};
            for (const c of customers) {
                customerMap[c.id] = c;
            }

            const enrichedCars = cars.map(car => ({
                ...car,
                customerName: customerMap[car.customerId]?.name || null,
                customerAddress: customerMap[car.customerId]?.address || null,
                customerData: customerMap[car.customerId] || null
            }));

            res.status(200).json({
                success: true,
                count: enrichedCars.length,
                cars: enrichedCars,
            });
        } catch (error) {
            console.error('❌ Get all cars error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching cars',
            });
        }
    }

    // Get cars by customer ID
    async getCarsByCustomer(req, res) {
        try {
            const userId = req.user.username;
            const { customerId } = req.params;

            const cars = await carDAO.getCarsByCustomerId(customerId, userId);

            res.status(200).json({
                success: true,
                count: cars.length,
                cars,
            });
        } catch (error) {
            console.error('❌ Get cars by customer error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching cars',
            });
        }
    }

    // Get car by ID
    async getCarById(req, res) {
        try {
            const userId = req.user.username;
            const { id } = req.params;

            const car = await carDAO.getCarById(id, userId);

            if (!car) {
                return res.status(404).json({
                    success: false,
                    error: 'Car not found',
                });
            }

            res.status(200).json({
                success: true,
                car,
            });
        } catch (error) {
            console.error('❌ Get car error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while fetching car',
            });
        }
    }

    // Create new car
    async createCar(req, res) {
        try {
            const userId = req.user.username;
            const {
                customerId,
                carOwnerName,
                carBrand,
                carModel,
                plateNumber,
                chassisNumber,
                engineNumber,
                startDate,
                dueDate,
                carPrice,
                color,
                year,
                notes,
                status,
                insuranceProvider,
                insuranceType,
                coverageExtensions
            } = req.body;

            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    error: 'Customer ID is required',
                });
            }

            const carInputData = {
                customerId: customerId,
                carData: {
                    ownerName: carOwnerName ? carOwnerName.trim() : '',
                    carBrand: carBrand ? carBrand.trim() : '',
                    carModel: carModel ? carModel.trim() : '',
                    plateNumber: plateNumber ? plateNumber.trim() : '',
                    chassisNumber: chassisNumber ? chassisNumber.trim() : '',
                    engineNumber: engineNumber ? engineNumber.trim() : '',
                    startDate: startDate || null,
                    dueDate: dueDate || null,
                    carPrice: carPrice ? parseFloat(carPrice) : 0,
                    color: color ? color.trim() : '',
                    year: year ? year.toString().trim() : '',
                    insuranceProvider: insuranceProvider ? insuranceProvider.trim() : '',
                    insuranceType: insuranceType ? insuranceType.trim() : '',
                    coverageExtensions: coverageExtensions || [],
                },
                carPhotos: {
                    leftSide: '', rightSide: '', front: '', back: '', dashboard: ''
                },
                documentPhotos: {
                    stnk: '', sim: '', ktp: '', polis: ''
                },
                notes: notes ? notes.trim() : '',
                status: status || 'Active',
                createdBy: userId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            const newCar = await carDAO.createCar(carInputData);

            console.log('✅ New car created:', newCar.id, 'by user:', userId);

            // Add brand and model to references asynchronously
            if (carBrand) {
                carReferenceDAO.addReference(carBrand, carModel).catch(err => console.error(err));
            }

            res.status(201).json({
                success: true,
                message: 'Car created successfully',
                car: newCar,
            });
        } catch (error) {
            console.error('❌ Create car error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while creating car: ' + error.message,
            });
        }
    }

    // Update car
    async updateCar(req, res) {
        try {
            const userId = req.user.username;
            const { id } = req.params;

            const {
                customerId,
                status,
                notes,
                carOwnerName, carBrand, carModel, plateNumber,
                chassisNumber, engineNumber, startDate, dueDate, carPrice,
                color, year, insuranceProvider, insuranceType, coverageExtensions,
                carData: carDataObj,
            } = req.body;

            const resolvedCarData = { ...(carDataObj || {}) };
            if (carOwnerName !== undefined) resolvedCarData.ownerName = carOwnerName.trim();
            if (carBrand !== undefined) resolvedCarData.carBrand = carBrand.trim();
            if (carModel !== undefined) resolvedCarData.carModel = carModel.trim();
            if (plateNumber !== undefined) resolvedCarData.plateNumber = plateNumber.trim();
            if (chassisNumber !== undefined) resolvedCarData.chassisNumber = chassisNumber.trim();
            if (engineNumber !== undefined) resolvedCarData.engineNumber = engineNumber.trim();
            if (startDate !== undefined) resolvedCarData.startDate = startDate;
            if (dueDate !== undefined) resolvedCarData.dueDate = dueDate;
            if (carPrice !== undefined) resolvedCarData.carPrice = parseFloat(carPrice);
            if (color !== undefined) resolvedCarData.color = color.trim();
            if (year !== undefined) resolvedCarData.year = year.toString().trim();
            if (insuranceProvider !== undefined) resolvedCarData.insuranceProvider = insuranceProvider.trim();
            if (insuranceType !== undefined) resolvedCarData.insuranceType = insuranceType.trim();
            if (coverageExtensions !== undefined) resolvedCarData.coverageExtensions = coverageExtensions;

            const updateData = {};
            if (customerId !== undefined) updateData.customerId = customerId;
            if (status !== undefined) updateData.status = status;
            if (notes !== undefined) updateData.notes = notes;
            if (Object.keys(resolvedCarData).length > 0) updateData.carData = resolvedCarData;

            const updatedCar = await carDAO.updateCar(id, updateData, userId);

            // Add brand and model to references asynchronously
            if (carBrand) {
                carReferenceDAO.addReference(carBrand, carModel).catch(err => console.error(err));
            }

            res.status(200).json({
                success: true,
                message: 'Car updated successfully',
                car: updatedCar,
            });
        } catch (error) {
            console.error('❌ Update car error:', error);
            if (error.message === 'Car not found') {
                return res.status(404).json({
                    success: false,
                    error: 'Car not found',
                });
            }
            res.status(500).json({
                success: false,
                error: 'Server error while updating car',
            });
        }
    }

    // Upload car photos
    async uploadCarPhotos(req, res) {
        try {
            const userId = req.user.username;
            const { id: carId } = req.params;

            console.log('📸 Uploading car photos for car:', carId);

            // Check if car exists
            const car = await carDAO.getCarById(carId, userId);
            if (!car) {
                return res.status(404).json({
                    success: false,
                    error: 'Car not found',
                });
            }

            const files = req.files;
            const uploadedPhotos = {};

            const uploadPromises = [];

            ['leftSide', 'rightSide', 'front', 'back', 'dashboard'].forEach(side => {
                if (files[side] && files[side][0]) {
                    uploadPromises.push(
                        new Promise((resolve, reject) => {
                            const stream = cloudinary.uploader.upload_stream(
                                {
                                    folder: `car_insurance/cars/${carId}`,
                                    public_id: `${carId}_${side}`,
                                    resource_type: 'image'
                                },
                                (error, result) => {
                                    if (error) reject(error);
                                    else {
                                        uploadedPhotos[side] = result.secure_url;
                                        resolve();
                                    }
                                }
                            );
                            stream.end(files[side][0].buffer);
                        })
                    );
                }
            });

            await Promise.all(uploadPromises);

            const updatedCar = await carDAO.updateCar(
                carId,
                { carPhotos: uploadedPhotos },
                userId
            );

            console.log('✅ Car photos uploaded for car:', carId);

            res.status(200).json({
                success: true,
                message: 'Car photos uploaded successfully',
                photos: uploadedPhotos,
                car: updatedCar,
            });
        } catch (error) {
            console.error('❌ Upload car photos error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while uploading car photos',
            });
        }
    }

    // Upload document photos (STNK, SIM, KTP)
    async uploadDocuments(req, res) {
        try {
            const userId = req.user.username;
            const { id: carId } = req.params;

            console.log('📄 Uploading documents for car:', carId);

            const car = await carDAO.getCarById(carId, userId);
            if (!car) {
                return res.status(404).json({
                    success: false,
                    error: 'Car not found',
                });
            }

            const files = req.files;
            const uploadedDocuments = {};
            const uploadPromises = [];

            ['stnk', 'sim', 'ktp', 'polis'].forEach(docType => {
                if (files[docType] && files[docType][0]) {
                    uploadPromises.push(
                        new Promise((resolve, reject) => {
                            const stream = cloudinary.uploader.upload_stream(
                                {
                                    folder: `car_insurance/cars/${carId}/documents`,
                                    public_id: `${carId}_${docType}`,
                                    resource_type: 'image'
                                },
                                (error, result) => {
                                    if (error) reject(error);
                                    else {
                                        uploadedDocuments[docType] = result.secure_url;
                                        resolve();
                                    }
                                }
                            );
                            stream.end(files[docType][0].buffer);
                        })
                    );
                }
            });

            await Promise.all(uploadPromises);

            const updatedCar = await carDAO.updateCar(
                carId,
                { documentPhotos: uploadedDocuments },
                userId
            );

            console.log('✅ Documents uploaded for car:', carId);

            res.status(200).json({
                success: true,
                message: 'Documents uploaded successfully',
                documents: uploadedDocuments,
                car: updatedCar,
            });
        } catch (error) {
            console.error('❌ Upload documents error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error while uploading documents',
            });
        }
    }

    // Delete car
    async deleteCar(req, res) {
        try {
            const userId = req.user.username;
            const { id } = req.params;

            // 1. Check if car exists
            const car = await carDAO.getCarById(id, userId);
            if (!car) {
                return res.status(404).json({
                    success: false,
                    error: 'Car not found',
                });
            }

            // 2. Query all payment records for this user to check if this car has any Paid payments
            const paymentDAO = require('../dao/paymentDAO');
            const allPayments = await paymentDAO.getAllPaymentsByUser(userId);
            const paidPayment = allPayments.find(p => p.carId === id && p.status === 'Paid');

            if (paidPayment) {
                return res.status(400).json({
                    success: false,
                    error: 'Kendaraan tidak dapat dihapus karena memiliki transaksi pembayaran (Payment) yang sudah lunas. Silakan ubah status kendaraan menjadi "Batal/Cancelled" pada menu Edit Mobil sebagai gantinya.',
                });
            }

            // 3. Perform a cascade delete for ONLY unpaid/pending records to clean up the database
            const { db } = require('../config/firebase');
            const batch = db.batch();

            // Delete quotations associated with the car
            const quotationDAO = require('../dao/quotationDAO');
            const userQuotationsRef = quotationDAO.getUserQuotationsRef(userId);
            const quotationsSnapshot = await userQuotationsRef.where('carId', '==', id).get();
            quotationsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete invoices associated with the car
            const invoiceDAO = require('../dao/invoiceDAO');
            const userInvoicesRef = invoiceDAO.getUserInvoicesRef(userId);
            const invoicesSnapshot = await userInvoicesRef.where('carId', '==', id).get();
            invoicesSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete unpaid payments associated with the car
            const userPaymentsRef = paymentDAO.getUserPaymentsRef(userId);
            const paymentsSnapshot = await userPaymentsRef.where('carId', '==', id).get();
            paymentsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete renewals associated with the car
            const renewalDAO = require('../dao/renewalDAO');
            const userRenewalsRef = renewalDAO.getUserRenewalsRef(userId);
            const renewalsSnapshot = await userRenewalsRef.where('carId', '==', id).get();
            renewalsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // Delete the car document itself
            const carRef = carDAO.getUserCarsRef(userId).doc(id);
            batch.delete(carRef);

            // Execute the batch transaction atomically
            await batch.commit();

            console.log('✅ Car and associated pending data deleted successfully:', id, 'by user:', userId);

            res.status(200).json({
                success: true,
                message: 'Car and associated pending records deleted successfully',
            });
        } catch (error) {
            console.error('❌ Delete car error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Server error while deleting car',
            });
        }
    }
}

module.exports = new CarController();
