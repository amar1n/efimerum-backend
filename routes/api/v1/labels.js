'use strict';

var debug = require('debug')('efimerum:labels');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();

router.get('/', function (req, res) {
    var user = firebase.auth().currentUser;
    if (user) {
        console.log('User is signed in', user);

    } else {
        console.log('No user is signed in');
    }

    var labelsRef = rootRef.child('labels');
    labelsRef.once('value')
        .then(function (snap) {
            return res.status(200).json({success: true, data: snap.val()});
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

// --------------------------------------
// --------------------------------------
module.exports = router;