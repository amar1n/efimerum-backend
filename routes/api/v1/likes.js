'use strict';

var debug = require('debug')('efimerum:likes');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var moment = require('moment');
var firebaseAuth = require('../../../lib/firebaseAuth.js');
var logError = require('./../../../lib/utils').logError;
var logInfo = require('./../../../lib/utils').logInfo;
var validateReqDataKeys = require('./../../../lib/utils').validateReqDataKeys;
var pushNotification = require('./../../../lib/googleCloudPlatform').pushNotification;

const node_Photos = '_photos';
const nodePhotos = 'photos';
const nodePhotosByLabel = 'photosByLabel';
const nodeLikes = 'likes';
const nodeLikesByPhoto = 'likesByPhoto';
const nodePhotosPostedByUser = 'photosPostedByUser';
const nodePhotosLikedByUser = 'photosLikedByUser';
const nodeGeoFireLikes = 'geofireLikes';
const languageEN = 'EN';
const nodeUsers = 'users';
const notificationCode = 'LIKE';

var GeoFire = require('geofire');
var geoFire = new GeoFire(rootRef.child(nodeGeoFireLikes));

/**
 * @api {post} /likes
 * @apiGroup Likes
 * @apiDescription Post a like in a single photo
 * @apiSuccess {String} data The like key
 * @apiParam {String} idToken User's ID token
 * @apiParam {String} photoKey Photo identifier
 * @apiParam {Number} [latitude] The latitude of the user performing the action
 * @apiParam {Number} [longitude] The longitude of the user performing the action
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/likes
 *
 *     body:
 *     {
 *       "idToken": "XXyXX",
 *       "photoKey": "-KcwxqctGBzxhzI5zJfH",
 *       "latitude": 41.375395,
 *       "longitude": 2.170624
 *     }
 *
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
 Este endpoint toca los siguientes nodos en Firebase...
 - _photos: Actualiza la foto de uso interno del backend añadiendo el like y modificando expirationDate y numOfLikes
 - geofireLikes: Crea la info de geolocalización del like usando GeoFire, para que los dispositivos puedan hacer búsquedas de likes por distancia
 - likes: Crea el like
 - likesByPhoto: Relaciona el like con su foto, para que los dispositivos puedan obtener los likes de una foto
 - photos: Actualiza la foto modificando expirationDate y numOfLikes
 - photosByLabel: Propaga la actualización de la foto
 - photosLikedByUser: Propaga la actualización de la foto
 - photosPostedByUser: Propaga la actualización de la foto

 Este endpoint realiza las siguientes acciones...
 0) Validamos que se reciben los parámetros acordados
 1) Obtenemos la referencia a la foto de uso exclusivo del Backend
 2) Validamos que el dueño de la foto no emite un like
 3) Validamos que un mismo usuario no emite más de un like
 4) Actualizamos el contador y expirationDate de la foto en la BBDD de Firebase
 5) Procesamos las coordenadas... si se reciben
 6) Generamos los nodos para los likes en la BBDD de Firebase
 7) Propagamos el like en la foto de uso exclusivo del Backend
 8) Propagamos la foto a todos los nodos que la redundan en la BBDD de Firebase
 - photosByLabel
 - photosPostedByUser
 - photosLikedByUser
 9) Persistimos en la BBDD de Firebase los nodos generados
 10.a) Enviamos una notificación al dueño de la foto, avisándole que su foto... gusta!!!
 10.b) Persistimos en la BBDD de Firebase la info de GeoFire
 */
router.post('/', firebaseAuth(), function (req, res) {
    var validReqBody = [
        'photoKey'];

    // 0) Validamos que se reciben los parámetros acordados
    var bodyKeys = Object.keys(req.body);
    var bFlag = validateReqDataKeys(validReqBody, bodyKeys);
    if (!bFlag) {
        logError('POST likes', 'Wrong API call (query)');
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    // 1) Obtenemos la referencia a la foto de uso exclusivo del Backend
    var photoKey = req.body.photoKey;
    var _photoRef = rootRef.child(node_Photos + '/' + photoKey);
    _photoRef.once('value')
        .then(function (snap) {
            var _photo = snap.val();
            var uid = req.uid || 'batman';

            // 2) Validamos que el dueño de la foto no emite un like
            if (_photo.owner === uid) {
                logError('POST likes', 'Owners can not make likes to their own photos');
                return res.status(400).json({success: false, error: 'Owners can not make likes to their own photos'});
            }

            // 3) Validamos que un mismo usuario no emite más de un like
            var bFlag = false;
            if (_photo.likes !== undefined) {
                var likes = Object.keys(_photo.likes);
                for (var i = 0; i < likes.length; i++) {
                    if (_photo.likes[likes[i]].userId === uid) {
                        bFlag = true;
                        break;
                    }
                }
            }
            if (bFlag) {
                logError('POST likes', 'Not more than one like per user for each photo');
                return res.status(400).json({success: false, error: 'Not more than one like per user for each photo'});
            }

            // 4) Actualizamos el contador y expirationDate de la foto en la BBDD de Firebase
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
                    logError('POST likes', 'Transaction failed abnormally! ' + error);
                    return res.status(500).json({
                        success: false,
                        error: 'Transaction failed abnormally! ' + error
                    });
                } else if (!committed) {
                    logError('POST likes', 'Transaction aborted!');
                    return res.status(500).json({success: false, error: 'Transaction aborted!'});
                } else {

                    // 5) Procesamos las coordenadas... si se reciben
                    var bFlagCoordinates = false;
                    var bodyLatitude = req.body.latitude;
                    var bodyLongitude = req.body.longitude;
                    var latitude = 0;
                    var longitude = 0;
                    if (typeof bodyLatitude !== 'undefined' && typeof bodyLongitude !== 'undefined') {
                        bFlagCoordinates = true;
                        latitude = Number(bodyLatitude);
                        longitude = Number(bodyLongitude);
                    }

                    // 6) Generamos los nodos para los likes en la BBDD de Firebase
                    var foto = snapshot.val();
                    var updates = {};
                    var likeKey = rootRef.child(nodeLikes).push().key;
                    var now = moment();
                    var likeData = {
                        creationDate: now.unix(),
                        userId: uid,
                        photoKey: photoKey
                    };

                    if (bFlagCoordinates) {
                        likeData.latitude = latitude;
                        likeData.longitude = longitude;
                    }

                    updates[nodeLikes + '/' + likeKey] = likeData;
                    updates[nodeLikesByPhoto + '/' + photoKey + '/' + likeKey] = likeData;

                    // 7) Propagamos el like en la foto de uso exclusivo del Backend
                    updates[node_Photos + '/' + photoKey + '/' + 'likes' + '/' + likeKey] = likeData;
                    updates[node_Photos + '/' + photoKey + '/' + 'numOfLikes'] = foto.numOfLikes;
                    updates[node_Photos + '/' + photoKey + '/' + 'expirationDate'] = foto.expirationDate;

                    // 8) Propagamos la foto a todos los nodos que la redundan en la BBDD de Firebase
                    //      - photosByLabel
                    //      - photosPostedByUser
                    //      - photosLikedByUser
                    if (foto.labels !== undefined) {
                        Object.keys(foto.labels[languageEN]).forEach(function (label) {
                            updates[nodePhotosByLabel + '/' + languageEN + '/' + label + '/' + photoKey] = foto;
                        });
                    }
                    updates[nodePhotosPostedByUser + '/' + foto.owner + '/' + photoKey] = foto;
                    updates[nodePhotosLikedByUser + '/' + uid + '/' + photoKey] = foto;
                    if (_photo.likes !== undefined) {
                        Object.keys(_photo.likes).forEach(function (like) {
                            updates[nodePhotosLikedByUser + '/' + _photo.likes[like].userId + '/' + photoKey] = foto;
                        });
                    }

                    // 9) Persistimos en la BBDD de Firebase los nodos generados
                    rootRef.update(updates)
                        .then(function () {

                            // 10.a) Enviamos una notificación al dueño de la foto, avisándole que su foto... gusta!!!
                            console.log('............AMG', nodeUsers + '/' + _photo.owner);
                            var userRef = rootRef.child(nodeUsers + '/' + _photo.owner);
                            userRef.once('value')
                                .then(function (snap) {
                                    var owner = snap.val();
                                    var fcmToken = owner.fcmToken;
                                    if (fcmToken === undefined) {
                                        logError('POST likes', '.............PushNotification ....with photoKey: ' + photoKey + ' ....with likeKey: ' + likeKey + ', Error: User (' + user.email + ') without FCM Token');
                                    } else {
                                        pushNotification(notificationCode, photoKey, fcmToken)
                                            .then(function (response) {
                                                logInfo('POST likes', '.............PushNotification ....with photoKey: ' + photoKey + ' ....with likeKey: ' + likeKey + ', Successfully sent with response: ' + response);
                                            })
                                            .catch(function (err) {
                                                logError('POST likes', '.............PushNotification ....with photoKey: ' + photoKey + ' ....with likeKey: ' + likeKey + ', Error: ' + err);
                                            });
                                    }
                                })
                                .catch(function (error) {
                                    logError('POST likes', '.............Read once in users with uuid: ' + _photo.owner + ' ....with photoKey: ' + photoKey + ' ....with likeKey: ' + likeKey + ', Error: ' + error);
                                });

                            // 10.b) Persistimos en la BBDD de Firebase la info de GeoFire
                            if (bFlagCoordinates) {
                                geoFire.set(likeKey, [latitude, longitude]).then(function () {
                                    return res.status(200).json({success: true, data: likeKey});
                                }).catch(function (error) {
                                    logError('POST likes', '.............GeoFire ....with photoKey: ' + photoKey + ' ....with likeKey: ' + likeKey + ', Error: ' + error);
                                    return res.status(500).json({
                                        success: false,
                                        error: 'Like added without GeoFire info!'
                                    });
                                });
                            } else {
                                return res.status(200).json({success: true, data: likeKey});
                            }
                        })
                        .catch(function (error) {
                            logError('POST likes', 'Error updating the database: ' + error);
                            return res.status(500).json({success: false, error: error});
                        });
                }
            });
        })
        .catch(function (error) {
            logError('POST likes', '.............Read once in _photos with photoKey: ' + photoKey + ' ....Error: ' + error);
            return res.status(500).json({
                success: false,
                error: error
            });
        });
});

// --------------------------------------
// --------------------------------------
module.exports = router;