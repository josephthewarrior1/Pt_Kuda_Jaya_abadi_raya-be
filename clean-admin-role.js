require('dotenv').config();
const { admin, db } = require('./config/firebase');

async function deleteCollection(collectionPath) {
  const snapshot = await db.collection(collectionPath).get();

  if (snapshot.empty) {
    console.log(`Collection ${collectionPath} is already empty.`);
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Deleted ${snapshot.size} documents from collection ${collectionPath}.`);
  return snapshot.size;
}

async function removeUserRoleFields() {
  const snapshot = await db.collection('users').get();

  if (snapshot.empty) {
    console.log('Collection users is empty.');
    return 0;
  }

  let changed = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    if (Object.prototype.hasOwnProperty.call(doc.data(), 'role')) {
      batch.update(doc.ref, {
        role: admin.firestore.FieldValue.delete(),
      });
      changed++;
      batchCount++;
    }

    if (batchCount === 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Removed role field from ${changed} user documents.`);
  return changed;
}

async function removeAuthRoleClaims(nextPageToken) {
  const result = await admin.auth().listUsers(1000, nextPageToken);
  let changed = 0;

  for (const user of result.users) {
    const claims = user.customClaims || {};
    if (Object.prototype.hasOwnProperty.call(claims, 'role')) {
      const { role, ...remainingClaims } = claims;
      await admin.auth().setCustomUserClaims(
        user.uid,
        Object.keys(remainingClaims).length > 0 ? remainingClaims : null
      );
      changed++;
    }
  }

  if (result.pageToken) {
    changed += await removeAuthRoleClaims(result.pageToken);
  }

  return changed;
}

async function run() {
  try {
    await deleteCollection('admins');
    await removeUserRoleFields();
    const cleanedClaims = await removeAuthRoleClaims();
    console.log(`Removed role custom claim from ${cleanedClaims} auth users.`);
    console.log('Admin and role cleanup finished.');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

run();
