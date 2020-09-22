const { db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
const {
    validateSignUpData,
    validateLoginData,
    reduceUserDetails,
} = require("../util/validators");
const { admin } = require("../util/admin");
firebase.initializeApp(config);

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    const { valid, errors } = validateSignUpData(newUser);
    if (!valid) return res.status(400).json(errors);

    const noImg = "blank-profile-picture-973460_1280.png";

    let token;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.status(400).json({
                    handle: "This handle is already taken",
                });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(
                        newUser.email,
                        newUser.password
                    );
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                userId,
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({
                token,
            });
        })
        .catch((err) => {
            console.log(err);
            if (err.code === "auth/email-already-in-use") {
                return res.status(400).json({
                    email: "Email already in use",
                });
            } else {
                return res.status(400).json({
                    error: err.message,
                });
            }
        });
};

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    const { valid, errors } = validateLoginData(user);
    if (!valid) return res.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.status(200).json({ token });
        })
        .catch((err) => {
            console.log(err);
            if (err.code === "auth/wrong-password") {
                return res.status(403).json({
                    general: "Wrong credentials, please try again",
                });
            } else return res.status(500).json({ message : "Please make sure to login with the correct credentials" });
        });
};

exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);
    db.doc(`/users/${req.user.handle}`)
        .update(userDetails)
        .then(() => {
            return res.status(201).json({
                message: "User details updated successfully",
            });
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({
                error: err.code,
            });
        });
};

exports.uploadImage = (req, res) => {
    const BusBoy = require("busboy");
    const path = require("path");
    const os = require("os");
    const fs = require("fs");

    const busboy = new BusBoy({ headers: req.headers });

    let ImageFileName;
    let ImageToBeUploaded = {};

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== "image/png" && mimetype !== "image/jpeg") {
            res.status(400).json({
                error: "Wrong file type",
            });
        }

        const ImageExtention = filename.split(".")[
            filename.split(".").length - 1
        ];
        ImageFileName = `${Math.round(
            Math.random() * 100000000000
        )}.${ImageExtention}`;
        const filepath = path.join(os.tmpdir(), ImageFileName);
        ImageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on("finish", () => {
        admin
            .storage()
            .bucket()
            .upload(ImageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: ImageToBeUploaded.mimetype,
                    },
                },
            })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${ImageFileName}?alt=media`;
                return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
            })
            .then(() => {
                return res.json({
                    message: "Image Uploaded Successfully",
                });
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).json({
                    error: "image upload failed",
                });
            });
    });
    busboy.end(req.rawBody);
};

exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db
                    .collection("likes")
                    .where("userHandle", "==", req.user.handle)
                    .get();
            }
        })
        .then((data) => {
            userData.likes = [];
            data.forEach((doc) => {
                userData.likes.push(doc.data());
            });
            return db
                .collection("notifications")
                .where("recipient", "==", req.user.handle)
                .orderBy("createdAt", "desc")
                .limit(10)
                .get();
        })
        .then((data) => {
            userData.notifications = [];
            data.forEach((doc) => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    createdAt: doc.data().createdAt,
                    read: doc.data().read,
                    screamId: doc.data().screamId,
                    type: doc.data().type,
                    notificationId: doc.id,
                });
            });
            return res.json(userData);
        })
        .catch((err) => res.status(500).json(err));
};

exports.getUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.params.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                userData.user = doc.data();
                return db
                    .collection("screams")
                    .where("userHandle", "==", req.params.handle)
                    .orderBy("createdAt", "desc")
                    .get();
            }
        })
        .then((data) => {
            userData.screams = [];
            data.forEach((scream) => {
                userData.screams.push(scream);
            });
            return res.status(200).json(userData);
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: err.code,
            });
        });
};

exports.markNotificationsRead = (req, res) => {
    let batch = db.batch()

    req.body.forEach((notificationId) => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification,{read : true});
    });
    batch.commit()
    .then(() => {
        return res.status(200).json({
            message : "notifications are marked read",
        });
    })
    .catch((err) => {
        return res.status(500).json({
            error : err.message,
        })
    })
};
