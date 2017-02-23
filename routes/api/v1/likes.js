'use strict';

var debug = require('debug')('efimerum:likes');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var moment = require('moment');
var firebaseAuth = require('../../../lib/firebaseAuth.js');
var _under = require('underscore');

const nodePhotos = 'photos';
const nodePhotosByLabel = 'photosByLabel';
const nodeLikes = 'likes';
const nodeLikesByPhoto = 'likesByPhoto';
const nodePhotosPostedByUser = 'photosPostedByUser';
const nodeGeoFireLikes = 'geofireLikes';
const languageEN = 'EN';

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
 0) Validamos que se reciben los query acordados
 1) Generamos los nodos para los likes en la BBDD de Firebase
 2) Preparamos los nodos de la photo que hay que actualizar en la BBDD de Firebase
      - photosByLabel
      - photosPostedByUser
      - photosLikedByUser
 3) Actualizamos el contador y expirationDate de la foto en la BBDD de Firebase
 4) Rellenamos los nodos de la photo que hay que actualizar en la BBDD de Firebase
 5) Persistimos en la BBDD de Firebase los nodos generados
 6) Persistimos en la BBDD de Firebase la info de GeoFire
 */
router.post('/', firebaseAuth(), function (req, res) {
    var validReqQuery = [
        'photoKey',
        'latitude',
        'longitude'];

    // 0) Validamos que se reciben los query acordados
    var queryKeys = Object.keys(req.query);
    for (var i = 0; i < validReqQuery.length; i++) {
        var bFlag = false;
        for (var j = 0; j < queryKeys.length; j++) {
            if (validReqQuery[i] === queryKeys[j]) {
                bFlag = true;
                break;
            }
        }
        if (!bFlag) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    // 1) Generamos los nodos para los likes en la BBDD de Firebase
    var uid = req.uid || 'batman';
    var photoKey = req.query.photoKey;
    var latitude = Number(req.query.latitude); // TODO: qué se hace si no viene info de geolocalización???
    var longitude = Number(req.query.longitude);
    var updatesLike = {};
    var likeKey = rootRef.child(nodeLikes).push().key;
    var now = moment();
    var likeData = {
        creationDate: now.unix(),
        latitude: latitude,
        longitude: longitude,
        userId: uid,
        photoKey: photoKey
    };
    updatesLike[nodeLikes + '/' + likeKey] = likeData;
    updatesLike[nodeLikesByPhoto + '/' + photoKey + '/' + likeKey] = likeData;

    var photoRef = rootRef.child(nodePhotos + '/' + photoKey);
    photoRef.once('value')
        .then(function (snap) {
            var foto = snap.val();

            // 2) Preparamos los nodos de la photo que hay que actualizar en la BBDD de Firebase
            //      - photosByLabel
            //      - photosPostedByUser
            //      - TODO: photosLikedByUser
            var updatesPhoto = {};
            Object.keys(foto.labels[languageEN]).forEach(function (label) {
                updatesPhoto[nodePhotosByLabel + '/' + languageEN + '/' + label + '/' + photoKey] = '';
            });
            updatesPhoto[nodePhotosPostedByUser + '/' + foto.owner + '/' + photoKey] = '';
            // TODO: photosLikedByUser

            // 3) Actualizamos el contador y expirationDate de la foto en la BBDD de Firebase
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

                    // 4) Rellenamos los nodos de la photo que hay que actualizar en la BBDD de Firebase
                    Object.keys(updatesPhoto).forEach(function (x) {
                        updatesPhoto[x] = snapshot.val();
                    });

                    // 5) Persistimos en la BBDD de Firebase los nodos generados
                    var updates = _under.extend(updatesLike, updatesPhoto);
                    rootRef.update(updates)
                        .then(function () {

                            // 6) Persistimos en la BBDD de Firebase la info de GeoFire
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
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

// --------------------------------------
// --------------------------------------
module.exports = router;