require('dotenv').config();
const { db } = require('./config/firebase');
const admin = require('firebase-admin');

async function run() {
  console.log('🔄 Starting migration of policyId to carId...');
  const collectionsToCheck = [
    { parent: 'quotation_records', sub: 'quotations' },
    { parent: 'invoice_records', sub: 'invoices' },
    { parent: 'payment_records', sub: 'payments' },
    { parent: 'renewal_records', sub: 'renewals' }
  ];

  try {
    for (const { parent, sub } of collectionsToCheck) {
      console.log(`Checking subcollection Group "${sub}" in parent "${parent}"...`);
      const snapshot = await db.collectionGroup(sub).get();
      let updatedCount = 0;
      let totalCount = 0;

      for (const doc of snapshot.docs) {
        totalCount++;
        const data = doc.data();
        
        // If policyId exists, copy its value to carId and delete policyId
        if (data.policyId !== undefined) {
          const policyIdValue = data.policyId;
          
          await doc.ref.update({
            carId: policyIdValue,
            policyId: admin.firestore.FieldValue.delete(),
            updatedAt: Date.now()
          });
          updatedCount++;
        }
      }
      console.log(`Finished ${sub}: checked ${totalCount} docs, migrated ${updatedCount} docs.`);
    }

    console.log('🎉 Policy ID migration to Car ID complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

run();
