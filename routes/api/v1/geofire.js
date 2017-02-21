'use strict';

var debug = require('debug')('efimerum:geofire');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();

const nodeGeoFirePhotos = 'geofirePhotos';

var GeoFire = require('geofire');
var geoFire = new GeoFire(rootRef.child(nodeGeoFirePhotos));

router.get('/', function (req, res) {

    var geoQuery = geoFire.query({
        center: [41.432630, 2.175797],
        radius: 30
    });

    var onKeyEnteredRegistration = geoQuery.on("key_entered", function (key, location) {
        console.log(key + " entered the query. Hi " + key + "!");
    });

    var onReadyRegistration = geoQuery.on("ready", function () {
        console.log("*** 'ready' event fired - cancelling query ***");
        geoQuery.cancel();
    });


    return res.status(200).json({success: true, data: 'AMG'});
});

// --------------------------------------
// --------------------------------------
module.exports = router;