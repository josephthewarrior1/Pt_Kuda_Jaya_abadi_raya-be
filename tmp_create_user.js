const { admin, db } = require('d:/thesis/Pt Kuda Jaya Abadi Raya Backend/config/firebase.js');

async function createTestAdmin() {
    try {
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail('testbot@example.com');
            console.log('User already exists, updating password...');
            await admin.auth().updateUser(userRecord.uid, { password: 'password123' });
        } catch(e) {
            if (e.code === 'auth/user-not-found') {
                userRecord = await admin.auth().createUser({
                    email: 'testbot@example.com',
                    emailVerified: true,
                    password: 'password123',
                    displayName: 'Test Bot',
                    disabled: false,
                });
                console.log('Created new user');
            } else {
                throw e;
            }
        }
        
        await db.collection('users').doc(userRecord.uid).set({
            email: 'testbot@example.com',
            name: 'Test Bot',
            username: 'testbot',
            role: 'Superadmin',
            firebaseUid: userRecord.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Successfully configured testbot in users collection');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
createTestAdmin();
