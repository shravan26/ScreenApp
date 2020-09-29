const functions = require("firebase-functions");
const express = require("express");
const app = express();
const {
    getAllScreams,
    createScreams,
    createScreamWithPhoto,
    getScream,
    commentOnScream,
    deleteScream,
    likeScream,
    unlikeScream,
    getNewestScreams,
    getOldestScreams
} = require("./handlers/screams");
const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead,
} = require("./handlers/users");
const { FBAuth } = require("./middleware/auth");
const { db } = require("./util/admin");
const cors = require("cors");


//Middleware
app.use(cors());
//Screams Route

app.get("/screams", getAllScreams);
app.get('/screams/new',getNewestScreams);
app.get('/screams/old',getOldestScreams);
app.post("/scream", FBAuth, createScreams);
app.get("/scream/:screamId", getScream);
app.delete("/scream/:screamId", FBAuth, deleteScream);
app.get("/scream/:screamId/like", FBAuth, likeScream);
app.get("/scream/:screamId/unlike", FBAuth, unlikeScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);
app.post('/scream/:screamId/upload', FBAuth, createScreamWithPhoto);
//Users Routes

app.post("/signup", signup);
app.post("/login", login);
app.post("/users/image", FBAuth, uploadImage);
app.post("/users", FBAuth, addUserDetails);
app.get("/users", FBAuth, getAuthenticatedUser);
app.get("/users/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

exports.api = functions.region("asia-south1").https.onRequest(app);

exports.createNotificationOnLike = functions
    .region("asia-south1")
    .firestore.document(`/likes/{id}`)
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
                if (
                    doc.exists &&
                    doc.data().userHandle !== snapshot.data().userHandle
                ) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        read: false,
                        screamId: snapshot.data().screamId,
                    });
                }
            })
            .catch((err) => {
                console.log(err);
                return;
            });
    });

exports.deleteNotificationOnUnlike = functions
    .region("asia-south1")
    .firestore.document("/likes/{id}")
    .onDelete((snapshot) => {
        return db
            .doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.log(err);
                return;
            });
    });

exports.createNotificationOnComment = functions
    .region("asia-south1")
    .firestore.document(`/comments/{id}`)
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
                if (
                    doc.exists &&
                    doc.data().userHandle !== snapshot.data().userHandle
                ) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        read: false,
                        screamId: snapshot.data().screamId,
                    });
                }
            })
            .catch(() => {
                console.log(err);
                return;
            });
    });

exports.onUserImageChange = functions
    .region("asia-south1")
    .firestore.document(`/users/{userId}`)
    .onUpdate((change) => {
        console.log(change.before);
        console.log(change.after);
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            let batch = db.batch();
            return db
                .collection("screams")
                .where("userHandle", "==", change.before.data().handle)
                .get()
                .then((data) => {
                    data.forEach((doc) => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, {
                            userImage: change.after.data().imageUrl,
                        });
                    });
                    batch.commit();
                });
        } else return true;
    });

exports.onScreamDeleted = functions
    .region("asia-south1")
    .firestore.document(`/screams/{screamId}`)
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db
            .collection("likes")
            .where("screamId", "==", screamId)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                });
                return db
                    .collection("comments")
                    .where("screamId", "==", screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                });
                return db
                    .collection("notifications")
                    .where("screamId", "==", screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                batch.commit();
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).json({
                    error: err.code,
                });
            });
    });
