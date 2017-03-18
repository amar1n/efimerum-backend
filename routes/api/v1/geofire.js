'use strict';

var debug = require('debug')('efimerum:geofire');
var express = require('express');
var router = express.Router();
var constants = require('./../../../lib/constants');
var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var GeoFire = require('geofire');
var geoFire = new GeoFire(rootRef.child(constants.firebaseNodes.geoFirePhotos));

// const nodeAmg = 'amg';
// const nodeAmgGeofire = 'amgGeofire';
// const nodeAmgsByUser = 'amgsByUser';
// var randomstring = require('randomstring');
// var moment = require('moment');
// var geoFire = new GeoFire(rootRef.child(nodeAmgGeofire));
// var geoFire2 = new GeoFire(rootRef.child(nodeAmg));
// var geoFire3 = new GeoFire(rootRef.child(nodeAmgsByUser + '/' + yo));
// var geoFire4 = new GeoFire(rootRef.child(nodeAmgsByUser));
// var yo = 'fXoii57NgBY1QPXh4XWAsu9l2Tx1';
// var evo = 'EV0WzMJvkEPXKIx0smdygkXnC3w2';

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

    // var amgRef = rootRef.child(nodeAmg);
    // // 1)
    // for (var i = 0; i < 100; i++) {
    //     const index = i;
    //     const amgKey = amgRef.push().key;
    //     geoFire.set(amgKey, [10, -66])
    //         .then(function () {
    //             var amgGeoRef = rootRef.child(nodeAmgGeofire + '/' + amgKey);
    //             amgGeoRef.once('value')
    //                 .then(function (snap) {
    //                     var amgGeo = snap.val();
    //                     var updates = {};
    //
    //                     var now = moment();
    //                     var amgData = {
    //                         index: index,
    //                         creationDate: now.unix(),
    //                         randomString: randomstring.generate(),
    //                         g: amgGeo['g'],
    //                         l: amgGeo['l']
    //                     };
    //
    //                     if (index % 2 == 0) {
    //                         updates[nodeAmgsByUser + '/' + yo + '/' + amgKey] = amgData;
    //                     } else {
    //                         updates[nodeAmgsByUser + '/' + evo + '/' + amgKey] = amgData;
    //                     }
    //
    //                     updates[nodeAmg + '/' + amgKey] = amgData;
    //
    //                     rootRef.update(updates)
    //                         .then(function () {
    //                             console.log('............................Ok: ', index);
    //                         })
    //                         .catch(function (error) {
    //                             console.log('............................Error: ', index);
    //                         });
    //                 })
    //                 .catch(function (error) {
    //                     console.log('............................Error', error);
    //                 });
    //         })
    //         .catch(function (error) {
    //             console.log('............................Error', error);
    //         });
    // }
    // amgRef.orderByChild('randomString').once('value')
    //     .then(function (snap) {
    //         var x = snap.val();
    //         console.log('............................', x);
    //     })
    //     .catch(function (error) {
    //         return res.status(500).json({success: false, error: error});
    //     });

    // // 2)
    // var geoQuery = geoFire4.query({
    //     center: [10, -66],
    //     radius: 3
    // });
    // var onKeyEnteredRegistration = geoQuery.on("key_entered", function (key, location) {
    //     console.log(key + " entered the query. Hi " + key + "!");
    // });
    // var onReadyRegistration = geoQuery.on("ready", function () {
    //     console.log("*** 'ready' event fired - cancelling query ***");
    //     geoQuery.cancel();
    // });

    // "amg": {
    //     ".indexOn": "g",
    //         ".write": true
    // },
    // "amgGeofire": {
    //     ".indexOn": ["g"],
    //         ".write": true
    // },
    // "amgsByUser": {
    //     "$user_id": {
    //         ".indexOn": "g"
    //     },
    //     ".write": true
    // },

    return res.status(200).json({success: true, data: 'AMG'});
});

// --------------------------------------
// --------------------------------------
module.exports = router;