/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {
  onDocumentUpdated,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

// Child Deletion Handler
export const handleChildDeletion = onDocumentUpdated(
  "deletionRequests/{requestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (
      before?.status !== "approved" &&
      after?.status === "approved" &&
      after?.requestType === "child"
    ) {
      const childId = after.targetId;
      try {
        await admin.firestore().collection("users").doc(childId).delete();

        const parentsSnap = await admin
          .firestore()
          .collection("users")
          .where("children", "array-contains", childId)
          .get();
        for (const parentDoc of parentsSnap.docs) {
          await parentDoc.ref.update({
            children: admin.firestore.FieldValue.arrayRemove(childId),
          });
        }

        await admin.auth().deleteUser(childId);

        await admin.firestore().collection("deletionLogs").add({
          userId: childId,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          requestId: event.params.requestId,
          type: "child",
        });
      } catch (err) {
        console.error("Error deleting child data:", err);
      }
    }
    return;
  }
);

// Parent Deletion Handler
export const handleParentDeletion = onDocumentUpdated(
  "deletionRequests/{requestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (
      before?.status !== "approved" &&
      after?.status === "approved" &&
      after?.requestType === "parent"
    ) {
      const parentId = after.targetId;
      try {
        const childrenSnap = await admin
          .firestore()
          .collection("users")
          .where("parents", "array-contains", parentId)
          .get();
        for (const childDoc of childrenSnap.docs) {
          await childDoc.ref.update({
            parents: admin.firestore.FieldValue.arrayRemove(parentId),
          });
        }

        await admin.firestore().collection("users").doc(parentId).delete();
        await admin.auth().deleteUser(parentId);

        await admin.firestore().collection("deletionLogs").add({
          userId: parentId,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          requestId: event.params.requestId,
          type: "parent",
        });
      } catch (err) {
        console.error("Error deleting parent data:", err);
      }
    }
    return;
  }
);

// Generic User Deletion Handler
export const handleUserDeletion = onDocumentUpdated(
  "deletionRequests/{requestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (
      before?.status !== "approved" &&
      after?.status === "approved" &&
      after?.requestType === "user"
    ) {
      const userId = after.targetId;
      try {
        await admin.firestore().collection("users").doc(userId).delete();
        await admin.auth().deleteUser(userId);

        await admin.firestore().collection("deletionLogs").add({
          userId,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          requestId: event.params.requestId,
          type: "user",
        });
      } catch (err) {
        console.error("Error deleting user data:", err);
      }
    }
    return;
  }
);

export const deleteUserAndData = onCall(async (request) => {
  const uid: string | undefined = request.data.uid;
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "No UID provided");
  }

  try {
    await admin.firestore().collection("users").doc(uid).delete();

    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "auth/user-not-found"
      ) {
        // Ignore, user already deleted from Auth
      } else {
        throw err;
      }
    }

    await admin
      .firestore()
      .collection("deletionLogs")
      .add({
        userId: uid,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        triggeredBy: request.auth?.uid || "system",
        type: "user",
      });

    return { success: true };
  } catch (err) {
    console.error("Error deleting user data:", err);
    const errorMsg =
      "Failed to delete user: " +
      (err instanceof Error ? err.message : String(err));
    const error = new functions.https.HttpsError("internal", errorMsg);
    throw error;
  }
});

export const logUserEdit = onCall(async (request) => {
  if (!request.auth) {
    // eslint-disable-next-line max-len
    const error = new functions.https.HttpsError(
      "unauthenticated",
      "Not authenticated"
    );
    throw error;
  }
  const { userId, changes, editorId, reason } = request.data;
  await admin.firestore().collection("userEditLogs").add({
    userId,
    changes,
    editorId,
    reason,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { success: true };
});

export const armageddonDeleteNonDevelopers = onCall(async (request) => {
  // Only allow developers to run this!
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Not authenticated"
    );
  }
  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(callerUid)
    .get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "developer") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only developers can run this function."
    );
  }

  // Fetch all users from Firestore
  const usersSnap = await admin.firestore().collection("users").get();
  const nonDevUids: string[] = [];
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (data.role !== "developer") {
      nonDevUids.push(userDoc.id);
    }
  }

  // Delete non-developer users from Firestore
  const firestoreDeletes = nonDevUids.map((uid) =>
    admin.firestore().collection("users").doc(uid).delete()
  );
  await Promise.all(firestoreDeletes);

  // Delete non-developer users from Auth
  // Firebase Auth Admin SDK can only delete 1000 users at a time
  const batchSize = 1000;
  for (let i = 0; i < nonDevUids.length; i += batchSize) {
    const batch = nonDevUids.slice(i, i + batchSize);
    await admin.auth().deleteUsers(batch);
  }

  // Optionally, log this event
  await admin.firestore().collection("deletionLogs").add({
    deletedBy: callerUid,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    type: "armageddon",
    count: nonDevUids.length,
  });

  return { success: true, deletedCount: nonDevUids.length };
});

// --- Add this Cloud Function for automatic cleanup of pre-created user docs ---
export const cleanUpPrecreatedUserDocs = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const snap = event.data;
    const newUserId = event.params.userId;
    const newUser = snap?.data();
    const email = (newUser?.email || "").trim().toLowerCase();

    if (!email) return;

    const usersRef = admin.firestore().collection("users");
    const querySnap = await usersRef.where("email", "==", email).get();

    const deletions: Promise<FirebaseFirestore.WriteResult>[] = [];
    querySnap.forEach((doc) => {
      if (doc.id !== newUserId) {
        deletions.push(doc.ref.delete());
      }
    });

    await Promise.all(deletions);
    return;
  }
);
