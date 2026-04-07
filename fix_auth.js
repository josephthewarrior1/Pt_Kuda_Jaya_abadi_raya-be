const { db } = require('./config/firebase');

async function fixTester123() {
  try {
    const uid = 'TrRODLargdckRbpg8ywOMr851QJ2'; // Full UID from the screenshot for josephsetiawan71@gmail.com
    await db.collection('users').doc('tester123').update({
      firebaseUid: uid,
      email: 'josephsetiawan71@gmail.com'
    });
    console.log(`✅ Sukses! Dokumen tester123 sekarang sudah di-link ke akun josephsetiawan71@gmail.com (UID: ${uid})`);
    console.log(`🎉 Silahkan coba login di frontend pakai josephsetiawan71@gmail.com`);
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

fixTester123();
