const fs = require('fs');
const { db } = require('./config/firebase');

const nestedMap = {
  'customer_data': 'customers',
  'car_data': 'cars',
  'invoice_records': 'invoices',
  'payment_records': 'payments',
  'renewal_records': 'renewals',
  'kwitansi_records': 'kwitansi'
};

const skippedCollections = new Set(['admins']);

const stripRemovedFields = (colName, docData) => {
  if (colName !== 'users' || !docData || typeof docData !== 'object') {
    return docData;
  }

  const { role, ...userData } = docData;
  return userData;
};

async function migrate() {
  try {
    console.log('Reading JSON file...');
    const raw = fs.readFileSync('pt-kuda-jaya-abadi-default-rtdb-export (2).json', 'utf8');
    const data = JSON.parse(raw);
    
    let totalDocs = 0;

    for (const [colName, colData] of Object.entries(data)) {
      if (typeof colData !== 'object' || !colData) continue;
      if (skippedCollections.has(colName)) {
        console.log(`Skipping removed collection ${colName}`);
        continue;
      }
      
      console.log(`Processing ${colName}...`);
      
      let colCount = 0;
      if (colName.endsWith('_counters')) {
        for (const [userId, val] of Object.entries(colData)) {
           let count = typeof val === 'number' ? val : (val.count || val || 0);
           await db.collection(colName).doc(userId).set({ count: Number(count) }, { merge: true });
           colCount++;
        }
      } 
      else if (nestedMap[colName]) {
        const subcol = nestedMap[colName];
        for (const [userId, userItems] of Object.entries(colData)) {
           if (typeof userItems !== 'object') continue;
           for (const [itemId, itemData] of Object.entries(userItems)) {
              if (itemData && typeof itemData === 'object') {
                  await db.collection(colName).doc(userId).collection(subcol).doc(itemId).set(stripRemovedFields(colName, itemData));
                  colCount++;
              }
           }
        }
      }
      else {
        // Flat collections (users, company_profiles, quotations, car_references, customers, etc)
        for (const [docId, docData] of Object.entries(colData)) {
           if (typeof docData === 'object' && docData) {
             await db.collection(colName).doc(docId).set(stripRemovedFields(colName, docData), { merge: true });
             colCount++;
           } else if (typeof docData === 'boolean' || typeof docData === 'string' || typeof docData === 'number') {
             // Edge case for primitives at root
             await db.collection(colName).doc(docId).set({ value: docData }, { merge: true });
             colCount++;
           }
        }
      }
      console.log(`-> Migrated ${colCount} docs into ${colName}`);
      totalDocs += colCount;
    }
    
    console.log(`\n🎉 Migration Completed Successfully! Total docs migrated: ${totalDocs}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
