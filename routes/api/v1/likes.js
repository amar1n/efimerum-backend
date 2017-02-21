'use strict';

var debug = require('debug')('efimerum:likes');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var moment = require('moment');
var firebaseAuth = require('../../../lib/firebaseAuth.js');

const nodePhotos = 'photos';
const nodeLikes = 'likes';
const nodeLikesByPhoto = 'likesByPhoto';
const nodeGeoFireLikes = 'geofireLikes';

var GeoFire = require('geofire');
var geoFire = new GeoFire(rootRef.child(nodeGeoFireLikes));

/**
 * @api {post} /likes
 * @apiGroup Likes
 * @apiDescription Post a like in a single photo
 * @apiSuccess {String} data The like key
 * @apiParam {String} idToken User's ID token
 * @apiParam {Number} photoKey Photo identifier
 * @apiParam {Number} latitude The latitude of the user performing the action
 * @apiParam {Number} longitude The longitude of the user performing the action
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/likes?idToken=XXyXX&photoKey=-KcwxqctGBzxhzI5zJfH&latitude=41.375395&longitude=2.170624
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "data": "-345345KcisySBwVA_AevvTJGD"
 * }
 * @apiErrorExample
 * HTTP/1.1 404 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (query)"
 *  }
 */
/*
 0) Validamos que sólo se reciben los query acordados
 1) Generamos los nodos en la BBDD de Firebase
 2) Actualizamos el contador y expirationDate de la foto en la BBDD de Firebase
 3) Persistimos en la BBDD de Firebase los nodos generados
 4) Persistimos en la BBDD de Firebase la info de GeoFire
 */
router.post('/', firebaseAuth(), function (req, res) {
    var validReqQuery = [
        'idToken',
        'photoKey',
        'latitude',
        'longitude'];

    // 0) Validamos que sólo se reciben los query acordados
    var queryKeys = Object.keys(req.query);
    for (var j = 0; j < queryKeys.length; j++) {
        if (validReqQuery.indexOf(queryKeys[j]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    // 1) Generamos los nodos en la BBDD de Firebase
    var uid = req.uid || 'batman';
    var photoKey = req.query.photoKey;
    var latitude = parseFloat(req.query.latitude); // TODO: qué se hace si no viene info de geolocalización???
    var longitude = parseFloat(req.query.longitude);
    var updates = {};
    var likeKey = rootRef.child(nodeLikes).push().key;
    var now = moment();
    var likeData = {
        creationDate: now.unix(),
        latitude: latitude,
        longitude: longitude,
        userId: uid,
        photoKey: photoKey
    };
    updates[nodeLikes + '/' + likeKey] = likeData;
    updates[nodeLikesByPhoto + '/' + photoKey + '/' + likeKey] = likeData;

    // 2) Actualizamos el contador y expirationDate de la foto en la BBDD de Firebase
    var photoRef = rootRef.child(nodePhotos + '/' + photoKey);
    photoRef.transaction(function (currentData) {
        if (currentData != null) {
            currentData.numOfLikes = currentData.numOfLikes + 1;
            currentData.expirationDate = moment.unix(currentData.expirationDate).add(30, 'minutes').unix();
            return currentData;
        } else {
            return 0;
        }
    }, function (error, committed, snapshot) {
        if (error) {
            return res.status(500).json({success: false, error: 'Transaction failed abnormally! ' + error.message});
        } else if (!committed) {
            return res.status(500).json({success: false, error: 'Transaction aborted!'});
        } else {
            // 3) Persistimos en la BBDD de Firebase los nodos generados
            rootRef.update(updates)
                .then(function () {

                    // 4) Persistimos en la BBDD de Firebase la info de GeoFire
                    geoFire.set(likeKey, [latitude, longitude]).then(function() {
                        return res.status(200).json({success: true, data: likeKey});
                    }).catch(function(error) {
                        console.log(".............GeoFire Error: " + error, '....with photoKey:', photoKey, '....with likeKey:', likeKey);
                        return res.status(500).json({success: false, error: 'Like added without GeoFire info!'});
                    });
                })
                .catch(function (error) {
                    return res.status(500).json({success: false, error: error});
                });
        }
    });
});

// --------------------------------------
// --------------------------------------
module.exports = router;