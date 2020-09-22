const { db,admin } = require("../util/admin");

exports.getAllScreams = (req, res) => {
    db.collection("screams")
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push({
                    id: doc.id,
                    data: doc.data(),
                });
            });
            return res.json(screams);
        })
        .catch((err) => console.log(err));
};

exports.createScreams = (req, res) => {
    const newScream = {
        
        body: req.body.body,
        userHandle: req.user.handle,
        imageUrl : req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount : 0,
        commentCount : 0
    };

    db.collection("screams")
        .add(newScream)
        .then((doc) => {
            const resScream = newScream;
            resScream.screamId = doc.id;
            console.log("Scream added successfully");
            return res.json(resScream);
        })
        .catch((err) => console.log(err));
};

exports.getScream = (req, res) => {
    let screamData = {};

    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: "Scream does not exist",
                });
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            return db
                .collection("comments")
                .where("screamId", "==", req.params.screamId)
                .orderBy("createdAt", "desc")
                .get();
        })
        .then((data) => {
            screamData.comments = [];
            data.forEach((doc) => {
                screamData.comments.push(doc.data());
            });
            return res.status(200).json(screamData);
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: err.code,
            });
        });
};

exports.commentOnScream = (req, res) => {
    if (req.body.body.trim() === "") return res.status(400).json({ error });

    let newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        handle: req.user.handle,
        imageUrl: req.user.imageUrl,
    };

    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({
                    error: "scream does not exist any more",
                });
            }
            return doc.ref.update({commentCount : doc.data().commentCount + 1});
        }).then(() => {
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            return res.status(201).json(newComment);
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: "Failed to save comment,try again",
            });
        });
};

exports.deleteScream = (req, res) => {
    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({
                    message: "The scream does not exist any more ",
                });
            }
            return doc.ref.delete();
        })
        .then(() => {
            return res.status(200).json({
                message: "Scream deleted successfully",
            });
        })
        .catch((err) => {
            console.log(err);
            return res.status(500).json({
                error: "delete failed",
            });
        });
};

exports.unlikeScream = (req, res) => {
    const likeDocument = db.collection('likes').where("userHandle","==",req.user.handle)
    .where('screamId',"==",req.params.screamId).limit(1);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
    .then(doc => {
        if(!doc.exists){
            return res.status(404).json({
                message : "Scream does not exist anymore"
            })
        }
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
    }).then(data => {
        if(data.empty){
            return res.status(400).json({ message : "Scream not liked"});
        }else{
            db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(() => {
                screamData.likeCount--;
                screamDocument.update({likeCount:screamData.likeCount});
            })
            .then(() => {
                return res.json(screamData);
            })
}
}).catch(err => res.status(500).json({ error : err.message}));
}

exports.likeScream = (req, res) => {
    const likeDocument = db.collection('likes').where("userHandle","==",req.user.handle)
    .where('screamId',"==",req.params.screamId).limit(1);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
    .then(doc => {
        if(!doc.exists){
            return res.status(404).json({
                message : "Scream does not exist anymore"
            })
        }
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
    }).then(data => {
        if(data.empty){
            return db.collection('likes').add({
                userHandle : req.user.handle,
                screamId : req.params.screamId
            })
            .then(() => {
                screamData.likeCount++;
                return screamDocument.update({ likeCount : screamData.likeCount });
            })
            .then(() => {
                return res.json(screamData);
            })
        }
        else{
            return res.status(400).json({ message : "Scream already liked"});
        }
    }).catch((err) => {
        console.log(err);
        return res.status(500).json({ error : err.message});
    })
}

exports.createScreamWithPhoto = (req, res) => {
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
                const screamImage = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${ImageFileName}?alt=media`;
                return db.doc(`/screams/${req.params.screamId}`).update({ screamImage });
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