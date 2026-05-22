const { admin, db } = require('d:/thesis/Pt Kuda Jaya Abadi Raya Backend/config/firebase.js');

async function createTestUser() {
  try {
    const username = 'testbot';
    const email = 'testbot@example.com';
    const password = 'password123';

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User already exists, updating password...');
      await admin.auth().updateUser(userRecord.uid, { password });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          uid: username,
          email,
          emailVerified: true,
          password,
          displayName: 'Test Bot',
          disabled: false,
        });
        console.log('Created new user');
      } else {
        throw e;
      }
    }

    await db.collection('users').doc(username).set({
      email,
      fullName: 'Test Bot',
      username,
      firebaseUid: userRecord.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Successfully configured testbot in users collection');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createTestUser();
