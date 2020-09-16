const { admin,db } = require("../util/admin");

 
exports.FBAuth = (req, res, next) => {
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        var idToken = req.headers.authorization.split("Bearer ")[1];
    } else return res.status(403).json({ error: "Not Authorized" });

    admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
            console.log(decodedToken);
            req.user = decodedToken;
            return db
                .collection("users")
                .where("userId", "==", req.user.uid)
                .limit(1)
                .get();
        })
        .then((data) => {
            req.user.handle = data.docs[0].data().handle;
            req.user.imageUrl = data.docs[0].data().imageUrl;
            return next();
        })
        .catch((err) => {
            console.log("Error with verification", err);
            return res.status(403).json(err);
        });
};