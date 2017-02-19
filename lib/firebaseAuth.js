'use strict';

var firebase = require('./googleCloudPlatform.js').firebase;

module.exports = function () {
    return function (req, res, next) {
        var idToken = req.body.idToken || req.query.idToken || req.headers['x-access-token'];
        if (idToken) {
            firebase.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    if(decodedToken.sub === undefined) {
                        return res.status(401).json({success: false, error: 'Failed to authenticate token, no sub!.'});
                    }
                    // if everything is good, save to request for use in other routes
                    req.uid = decodedToken.sub;
                    next();
                })
                .catch(function (error) {
                    return res.status(401).json({success: false, error: 'Failed to authenticate token.'});
                });
        } else {
            // if there is no token return error
            return res.status(403).json({success: false, error: 'No token provided.'});
        }
    };
};
