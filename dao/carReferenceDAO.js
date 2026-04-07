const { db } = require('../config/firebase');

class CarReferenceDAO {
    constructor() {
        this.ref = db.collection('car_references');
    }

    async getReferences() {
        try {
            const snapshot = await this.ref.get();
            const references = {};
            snapshot.forEach(doc => {
                references[doc.id] = doc.data();
            });
            return references;
        } catch (error) {
            throw new Error('Failed to get car references: ' + error.message);
        }
    }

    async addReference(brand, model) {
        if (!brand) return;
        try {
            const cleanBrand = brand.trim();
            const docRef = this.ref.doc(cleanBrand);
            const updates = { _brandExists: true };

            if (model) {
                const cleanModel = model.trim();
                updates[cleanModel] = true;
            }

            // Using merge true allows patching paths safely
            await docRef.set(updates, { merge: true });
        } catch (error) {
            // Drop error silently to not disrupt the main flow
            console.error('Failed to add car reference:', error.message);
        }
    }
}

module.exports = new CarReferenceDAO();
