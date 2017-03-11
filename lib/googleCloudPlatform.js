'use strict';

var firebase = require('firebase');
firebase.initializeApp({
    // Alberto Marín
    // serviceAccount: "./efimerum-d15e8-firebase-adminsdk-65uxl-c4270b5ad2.json",
    // databaseURL: "https://efimerum-d15e8.firebaseio.com"

    // Grupo
    serviceAccount: "./efimerum-48618-firebase-adminsdk-fzt6q-857e408fd2.json",
    databaseURL: "https://efimerum-48618.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: 'wolverine'
    }
});
module.exports.firebase = firebase;

var storage = require('@google-cloud/storage');
module.exports.storage = storage({
    // Alberto Marín
    // projectId: 'efimerum-157719',
    // keyFilename: './application_default_credentials_amg.efimero.json'

    // Grupo
    projectId: 'efimerum-48618',
    keyFilename: './application_default_credentials.json'
});

var vision = require('@google-cloud/vision')({
    // Alberto Marín
    // projectId: 'efimerum-157719',
    // keyFilename: './application_default_credentials_amg.efimero.json'

    // Grupo
    projectId: 'efimerum-48618',
    keyFilename: './application_default_credentials.json'
});
module.exports.vision = vision;

var translate = require('@google-cloud/translate');
module.exports.translate = translate({
    projectId: 'efimerum-48618',
    keyFilename: './application_default_credentials.json'
});

var winston = require('winston');
require('winston-gae');
module.exports.logger = new winston.Logger({
    levels: winston.config.GoogleAppEngine.levels,
    transports: [
        new winston.transports.GoogleAppEngine({
            // capture logs at emergency level and above (all levels)
            level: 'default'
        })
    ]
});

var FCM = require('fcm-push');
var fcmServerKey = 'AAAAo_CJqfY:APA91bHIpaGtCL7Vhs-uhU5u5clbhVqFtGw_0D0kywuWYGunbZVTTzdAJV8oA5O9_8WDIIb6oetodfITDhLwti1Ial8vE4chayOb7MjXKgHmCUMUjI4j3KLDN-UzaTdlLnp2uJQAAg5O';
var fcm = new FCM(fcmServerKey);
var pushNotification = function (notificationCode, photoId, deviceToken) {
    var title = '';
    var body = '';

    if (notificationCode === 'LIKE') {
        title = 'Tu foto gusta!!!';
        body = 'Genial... tu foto le gusta a alguien!!!';
    } else {
        var error = {
            code: 0,
            message: 'Wrong notification code (' + notificationCode + ')!!!'
        };
        return Promise.reject(error);
    }

    var message = {
        to: deviceToken, // required fill with device token or topics
        data: {
            code: notificationCode,
            photoId: photoId
        },
        notification: {
            title: title,
            body: body
        }
    };

    return fcm.send(message);
};
module.exports.pushNotification = pushNotification;
