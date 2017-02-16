'use strict';

var firebase = require('./googleCloudPlatform.js').firebase;

module.exports = function () {
    return function (req, res, next) {
        var idToken = req.body.idToken || req.query.idToken || req.headers['x-access-token'] ||
            'eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg5ZTNlMWUzZmVmZjg0YmIyYzBjNWFkYTM4MzNlN2Q0YjQ4YWZkNGQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZWZpbWVydW0tNDg2MTgiLCJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImF1ZCI6ImVmaW1lcnVtLTQ4NjE4IiwiYXV0aF90aW1lIjoxNDg3MjAzODg2LCJ1c2VyX2lkIjoidzRWaGJVTkVtVFptRjFlQkc0eXBQTk9YNnRoMiIsInN1YiI6Inc0VmhiVU5FbVRabUYxZUJHNHlwUE5PWDZ0aDIiLCJpYXQiOjE0ODcyNTYwNzEsImV4cCI6MTQ4NzI1OTY3MSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJhbm9ueW1vdXMifX0.tVXKQoCUvT-Ua5x2MqWJ85hgG4xmtlk0NuX3rmtI7v1GVPD45vzZQqTSmJcINp1k-q-VvVq8B9krRanZn3Ke2hlaN5xXf_goaFlHhQZodlDS8yoTxec2C5fCK_ibs94VkkgzUQYOhSQuUJvyU5B1Mh-ruD1m3j3tY7Gv-OHgK81W6LFp5RtWStMsmGnbVF2GVyhcgZCDjqjpzzsdtYI4KhvwCnvzBriyZ8l397bZHHeksHCflp2mutM9YdwnPkbAQ8U8fvkhLTWsyQ-asDIrl2_5k2I8SZdHkuqfDxiDSC8gNicZ8BF-VYi8mPEzOGJql7feFDt49YLfzualBgxyfQ';
        if (idToken) {
            console.log('PEPE');
            firebase.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
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
