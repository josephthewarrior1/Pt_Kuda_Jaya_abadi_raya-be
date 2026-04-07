const { admin, db } = require('./config/firebase');

async function syncUsers() {
  try {
    console.log('🔄 Starting user sync...');
    const listUsersResult = await admin.auth().listUsers();
    
    for (const record of listUsersResult.users) {
      const email = record.email;
      const uid = record.uid;
      
      console.log(`\n🔍 Searching matching Firestore doc for ${email} (UID: ${uid})...`);
      
      // 1. Try by exact email match
      const emailSnapshot = await db.collection('users').where('email', '==', email).get();
      if (!emailSnapshot.empty) {
         const doc = emailSnapshot.docs[0];
         await doc.ref.update({ firebaseUid: uid });
         console.log(`✅ Updated doc '${doc.id}' with firebaseUid: ${uid}`);
         continue;
      }
      
      // 2. Try predicting username from email prefix (e.g., josephsetiawan71 -> josephsetiawan)
      // Custom for your case: user document is "josephsetiawan" but email is "josephsetiawan71@gmail.com"
      const prefix = email.split('@')[0];
      const possibleUsernames = [
        prefix,
        prefix.replace(/[0-9]/g, ''), // Strip numbers: josephsetiawan71 -> josephsetiawan
        'admin',
      ];
      
      let matched = false;
      for (const uname of possibleUsernames) {
          const usernameDoc = await db.collection('users').doc(uname).get();
          if (usernameDoc.exists) {
             await usernameDoc.ref.update({ firebaseUid: uid, email: email });
             console.log(`✅ Updated doc '${uname}' with firebaseUid: ${uid} and email: ${email}`);
             matched = true;
             break;
          }
      }
      
      if (!matched) {
         console.log(`⚠️ Could not find matching Firestore doc for ${email}`);
      }
    }
    
    console.log('\n🎉 Sync complete!');
  } catch (err) {
    console.error('❌ Error syncing:', err);
  }
}

syncUsers();
