const admin = require('firebase-admin');

const serviceAccount = {
  type: 'service_account',
  project_id: 'pt-kuda-jaya-abadi',
  private_key_id: '4f1ef7fe460fa1e56add39a05dbe64cf6454d6b5',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCv3YAEadfBvhIJ\nyEakcRUI6R3pQQbZofaRefbOZVkc+0pFRjs8Krb07zoaYTxmA1G65lr061u5Z4ym\nEKpiZfYn7pIOGXvcd6kZxEKkqNzrxj32yJNn8YUHiFXDAXp6Q5EOxDQsrtLOR+Z4\natO9P9tp0SwMAuhaQoRjoDb5lxnDgwHFYXQC7ferIBA/eiuXeGPYY1ke3OFLqD0L\nH5hvWWcp6aLCJX6sAODRHzy4/RYI16eiYuN3lUKyeVjOkU/YT0o9Vj1XiFChkBQq\nGEJWAXa430/hf+b7s/MbQI1XSkYJX0rSoNfh74Ommt5WDry0yRv7jqDLCHAg2vCN\n9qn/hqJ7AgMBAAECggEAIqUJd5UcPlwBtLCiDfoC8U7vKAi53zyzVKRItQ8tF3L/\nhhcYSzmE8kqAUTsPiW8k9iM0DuSgnK0j/YDx99FrRSGP3zww9NUT2HIbyNFFOCNF\nCK0psMPY94tpjbFoXdaaqGSJfLXx7FYotlchIDqIsFdXDIS0HjfVWcTxn4ifOC7u\nUTMFeyTJQlUbSkPfDE/0AfNq/XvMelMIOWmicnXG9H/bBJDkMdsZzZTX5aOujOmP\ncZ8wQ0hOVsFHHdTkoFPD/+HpjMP0rCVy1+ecNprIhppOftLPO2VK8TBNYOYurKeV\nR58HolxWIuj1dhDglaXJzvf4qa0CrfmJMBOEriVa9QKBgQDmvJFRCfT3W8l20huW\nHSr6ngah5nDCci7mLX0G3ydRouIwdefxhL1I6epDW4cMgDF1WSwes12oBccOxk0Z\ncbLLJksT1V0GFTzi5bCOfaCRWqD5986S+pr1UbQU5t8+3Zy/gGXf5tunWDAuE/jN\nlSWFdSRSw4e9+jtwEnJ2tmBDrQKBgQDDHupbTY6fG09jnUXPvbhpMzw1IB3MJBwG\nH7emQLUVuuzENlTVzSBTHQT6lbvUt8UsAa3Ikv2kY7bSl1ndzSDjEuvDuT5ZEhuN\nkDi0tBoLhWOP8HfVV/eaU4hayoJV2FM3c385bY9TJT2FYLlzEGcwtXkxknCZBy4g\nm6AGZmMDxwKBgB2QOZpFiVKMOyLzRr+UGyajSrxBt17inGm3mFZiDzqhgROud7p1\nRH9sISziNEqAvlWHyGRinPRjUR7uf4BsFfl7fZEb/GBEJln4Dggjxof5Mbj1bE1e\nuK4H+ufWsPHwGR5cSDFI9gnZ/cpZmr5UhsszuCS2ktTfk/AHHQ1izrC9AoGBAIdo\nqAku3KBMSp794RnXNuhC9zCDFkq6cHxLfJ6y3ziyXWeZsOwjC6DCTdc9HHn2Aq6U\nh67fW4i+7nxdLq9/kKglVFqi7sLPjzGB+ehl6IFAU6Tro635+0otWD5xtVuv4ahk\nzdDj2IhCGty6EFjq9EHYXr/pOZzpX7ifZ8GpQmO3AoGAOYUt7JUpU1dSz/QxZ20W\nkHr4Z3nqt6yeL9AuK4wdziMa8AWqNfy/QAqMH0SAwHlpRKUcQryWvtvlnJ8GVc4s\naeVr6jmRnB/cErPN4pi+5HAol4JyvuuyRU2FfrfUzgPotsALElv6bUuQDPz1EV8E\nED+rHij97e8UhY6DYJ1gMic=\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@pt-kuda-jaya-abadi.iam.gserviceaccount.com',
  client_id: '106062295157596904',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40pt-kuda-jaya-abadi.iam.gserviceaccount.com'
};

// FIX: Check if Firebase is already initialized (untuk Vercel serverless)
let auth, db;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://pt-kuda-jaya-abadi-default-rtdb.asia-southeast1.firebasedatabase.app/'
    });
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('✅ Firebase Admin already initialized');
  }
  
  auth = admin.auth();
  db = admin.database();
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  // JANGAN throw error, export null aja
  auth = null;
  db = null;
}

module.exports = { admin, auth, db };