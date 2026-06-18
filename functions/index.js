const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendNotificationOnTaskAssignment = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const notificationData = snapshot.data();
    if (!notificationData) {
      console.log("No notification data found.");
      return null;
    }

    const { userId, message, taskId, moduleType, projectId, projectName } = notificationData;
    if (!userId) {
      console.log("No userId field present in the notification.");
      return null;
    }

    console.log(`Processing notification for userId (email): ${userId}`);

    try {
      // Retrieve the user document from the "users" collection
      // Our users are keyed by lowercased, trimmed email
      const normalizedUserId = userId.toLowerCase().trim();
      const userDocRef = admin.firestore().collection("users").doc(normalizedUserId);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.log(`User document not found for email: ${normalizedUserId}`);
        return null;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token (fcmToken) found for user: ${normalizedUserId}`);
        return null;
      }

      console.log(`Sending push notification to token for: ${normalizedUserId}`);

      const payload = {
        token: fcmToken,
        notification: {
          title: "SuryaDesk",
          body: "You have a new task assigned to you.",
        },
        data: {
          taskId: String(taskId || ""),
          moduleType: String(moduleType || ""),
          projectId: String(projectId || ""),
          projectName: String(projectName || ""),
          message: String(message || ""),
        },
        webpush: {
          notification: {
            title: "SuryaDesk",
            body: "You have a new task assigned to you.",
            icon: "/icon-192.png", // absolute webapp logo path
          }
        }
      };

      const response = await admin.messaging().send(payload);
      console.log("Instantly sent FCM push notification successfully:", response);
      return response;
    } catch (error) {
      console.error("Error fetching user or sending FCM push notification:", error);
      return null;
    }
  });
