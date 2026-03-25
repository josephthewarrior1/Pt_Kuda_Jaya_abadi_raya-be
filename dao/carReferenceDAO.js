const { db } = require('../config/firebase');

class CarReferenceDAO {
    constructor() {
        this.ref = db.ref('car_references');
    }

    async getReferences() {
        try {
            const snapshot = await this.ref.once('value');
            return snapshot.val() || {};
        } catch (error) {
            throw new Error('Failed to get car references: ' + error.message);
        }
    }

    async addReference(brand, model) {
        if (!brand) return;
        try {
            const cleanBrand = brand.trim();
            const updates = {};

            if (model) {
                const cleanModel = model.trim();
                updates[`${cleanBrand}/${cleanModel}`] = true;
            } else {
                updates[`${cleanBrand}/_brandExists`] = true;
            }

            // Using root car_references node update allows patching paths safely
            await this.ref.update(updates);
        } catch (error) {
            // Drop error silently to not disrupt the main flow
            console.error('Failed to add car reference:', error.message);
        }
    }
}

module.exports = new CarReferenceDAO();
