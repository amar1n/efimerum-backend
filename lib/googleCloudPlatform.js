'use strict';

var firebase = require('firebase');
firebase.initializeApp({
    serviceAccount: "./efimerum-d15e8-firebase-adminsdk-65uxl-c4270b5ad2.json",
    databaseURL: "https://efimerum-d15e8.firebaseio.com"
});
module.exports.firebase = firebase;

var storage = require('@google-cloud/storage');
module.exports.storage = storage({
    projectId: 'efimerum-157719',
    keyFilename: './application_default_credentials.json'
});

var vision = require('@google-cloud/vision')({
    projectId: 'efimerum-157719',
    keyFilename: './application_default_credentials.json'
});
module.exports.vision = vision;