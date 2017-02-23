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