'use strict';

var constants = require('./constants');

var firebase = require('firebase');
firebase.initializeApp({
    // Alberto Marín
    // serviceAccount: "./efimerum-d15e8-firebase-adminsdk-65uxl-c4270b5ad2.json",
    // databaseURL: "https://efimerum-d15e8.firebaseio.com"

    // Grupo
    serviceAccount: "./efimerum-48618-firebase-adminsdk-fzt6q-857e408fd2.json",
    databaseURL: constants.firebase.databaseURL,
    databaseAuthVariableOverride: {
        uid: constants.firebase.uid
    }
});
module.exports.firebase = firebase;

var storage = require('@google-cloud/storage');
module.exports.storage = storage({
    // Alberto Marín
    // projectId: 'efimerum-157719',
    // keyFilename: './application_default_credentials_amg.efimero.json'

    // Grupo
    projectId: constants.firebase.projectId,
    keyFilename: './application_default_credentials.json'
});

var vision = require('@google-cloud/vision')({
    // Alberto Marín
    // projectId: 'efimerum-157719',
    // keyFilename: './application_default_credentials_amg.efimero.json'

    // Grupo
    projectId: constants.firebase.projectId,
    keyFilename: './application_default_credentials.json'
});
module.exports.vision = vision;

var translate = require('@google-cloud/translate');
module.exports.translate = translate({
    projectId: constants.firebase.projectId,
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
var fcm = new FCM(constants.firebasePushNotifications.fcmServerKey);
var pushNotification = function (notificationCode, photoId, deviceToken) {
    var title = '';
    var body = '';

    if (notificationCode === constants.firebasePushNotifications.likeNotificationCode) {
        title = constants.firebasePushNotifications.likeNotificationTitle;
        body = constants.firebasePushNotifications.likeNotificationBody;
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
            body: body,
            click_action: constants.firebasePushNotifications.likeClickAction
        }
    };

    return fcm.send(message);
};
module.exports.pushNotification = pushNotification;
