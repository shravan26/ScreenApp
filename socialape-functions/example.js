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
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        console.log('Field [' + fieldname + ']: value: ' + inspect(val));
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