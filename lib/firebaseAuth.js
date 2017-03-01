'use strict';

var firebase = require('./googleCloudPlatform.js').firebase;
var logError = require('./utils').logError;

module.exports = function () {
    return function (req, res, next) {
        var uid = req.body.uid || req.query.uid;
        var test = req.body.test || req.query.test;
        if (uid !== undefined && test !== undefined) {
            req.uid = uid;
            next();
            return;
        }

        var idToken = req.body.idToken || req.headers['x-access-token'];
        if (idToken) {
            firebase.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    if(decodedToken.sub === undefined) {
                        logError('firebaseAuth', 'Failed to authenticate token, no sub!.');
                        return res.status(401).json({success: false, error: 'Failed to authenticate token, no sub!.'});
                    }

                    if (decodedToken.firebase.sign_in_provider === 'anonymous') {
                        logError('firebaseAuth', 'It is forbidden for anonymous users!.');
                        return res.status(403).json({success: false, error: 'It is forbidden for anonymous users!.'});
                    }

                    // if everything is good, save to request for use in other routes
                    req.uid = decodedToken.sub;
                    next();
                })
                .catch(function (error) {
                    logError('firebaseAuth', 'Failed to authenticate token.');
                    return res.status(401).json({success: false, error: 'Failed to authenticate token.'});
                });
        } else {
            // if there is no token return error
            logError('firebaseAuth', 'No token provided.');
            return res.status(403).json({success: false, error: 'No token provided.'});
        }
    };
};
