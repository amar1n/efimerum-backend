'use strict';

var debug = require('debug')('efimerum:photos');
var express = require('express');
var router = express.Router();
var fs = require('fs');

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var shuffleFirebaseSnapshot = require('./../../../lib/utils').shuffleFirebaseJSON;
var storage = require('./../../../lib/googleCloudPlatform.js').storage;
var vision = require('./../../../lib/googleCloudPlatform').vision;
var translate = require('./../../../lib/googleCloudPlatform.js').translate;
var multer = require('./../../../lib/utils').multer;
var moment = require('moment');
var sizeOf = require('image-size');

const nodePhotosRequestedByUsers = 'nodePhotosRequestedByUsers';
const nodePhotos = 'photos';
const nodeLabels = 'labels';
const nodePhotosByLabels = 'photosByLabels';
const nodePhotosPostedByUsers = 'photosPostedByUsers';
const languageEN = 'EN';
const languageES = 'ES';
const efimerumStorageBucket = 'efimerum-photos';
const efimerumStorageBucketPublicURL = 'https://storage.googleapis.com/efimerum-photos';

router.get('/json', function (req, res) {
    var validReqQuery = [
        'uid',
        'label',
        'latitude',
        'longitude',
        'distance',
        'mostViewed',
        'closeToDying',
        'longestPhotos',
        'myPhotos',
        'lang'];

    var uid = req.query.uid || 'CCq864Wku8damv2C5TaZs4s5cpz2';
    var label = req.query.label;
    var latitude = req.query.latitude;
    var longitude = req.query.longitude;
    var distance = parseInt(req.query.distance) || 0;
    var mostViewed = req.query.mostViewed;
    var closeToDying = req.query.closeToDying;
    var longestPhotos = req.query.longestPhotos;
    var myPhotos = req.query.myPhotos;
    var lang = req.query.lang;

    // Validamos que sólo se reciben los query acordados...
    var queryKeys = Object.keys(req.query);
    for (var j = 0; j < queryKeys.length; j++) {
        if (validReqQuery.indexOf(queryKeys[j]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    var photosRef = rootRef.child(nodePhotos);
    photosRef.once('value')
        .then(function (snap) {
            var snapShuffled = shuffleFirebaseSnapshot(snap);
            return res.status(200).json({success: true, data: snapShuffled});
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

/**
 * @api {get} /photos
 * @apiGroup Photos
 * @apiDescription Retrieve a list of photos
 * @apiParam {String} uid User's id
 * @apiParam {String} [label] Filter by label
 * @apiParam {Number} [latitude] Filter by geolocation (Latitude). Used with longitude and distance. Use geolocation alone or in combination with label
 * @apiParam {Number} [longitude] Filter by geolocation (Longitude). Used with latitude and distance. Use geolocation alone or in combination with label
 * @apiParam {Number} [distance] Filter by geolocation (Distance). Used with latitude and longitude. Use geolocation alone or in combination with label
 * @apiParam {Boolean} [mostViewed] Filter by most viewed. Use alone or in combination with label
 * @apiParam {Boolean} [closeToDying] Filter by close to dying. Use alone or in combination with label
 * @apiParam {Boolean} [longestPhotos] Filter by longest photos. Use alone or in combination with label
 * @apiParam {Boolean} [myPhotos] Filter by the photos posted by the user with the indicated uid. Use alone or in combination with label
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/photos?uid=CCq864Wku8damv2C5TaZs4s5cpz2&label=cartoon&myPhotos=true
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "data": "https://efimerum-48618.firebaseio.com/nodePhotosRequestedByUsers/CCq864Wku8damv2C5TaZs4s5cpz2"
 * }
 * @apiErrorExample
 * HTTP/1.1 404 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (query)"
 *  }
 */
router.get('/', function (req, res) {
    var validReqQuery = [
        'uid',
        'label',
        'latitude',
        'longitude',
        'distance',
        'mostViewed',
        'closeToDying',
        'longestPhotos',
        'myPhotos'];

    var uid = req.query.uid || 'CCq864Wku8damv2C5TaZs4s5cpz2';
    var label = req.query.label;
    var latitude = req.query.latitude;
    var longitude = req.query.longitude;
    var distance = parseInt(req.query.distance) || 0;
    var mostViewed = req.query.mostViewed;
    var closeToDying = req.query.closeToDying;
    var longestPhotos = req.query.longestPhotos;
    var myPhotos = req.query.myPhotos;

    // Validamos que sólo se reciben los query acordados...
    var queryKeys = Object.keys(req.query);
    for (var j = 0; j < queryKeys.length; j++) {
        if (validReqQuery.indexOf(queryKeys[j]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    var photosRef = rootRef.child(nodePhotos);
    photosRef.once('value')
        .then(function (snap) {
            var snapShuffled = shuffleFirebaseSnapshot(snap);
            var updates = {};
            updates[nodePhotosRequestedByUsers + '/' + uid] = snapShuffled;
            rootRef.update(updates)
                .then(function () {
                    return res.status(200).json({success: true, data: rootRef.toString() + nodePhotosRequestedByUsers + '/' + uid });
                }).catch(function (error) {
                    return res.status(503).json({success: false, error: error});
                });
        })
        .catch(function (error) {
            return res.status(503).json({success: false, error: error});
        });
});

/**
 * @api {post} /photos
 * @apiGroup Photos
 * @apiDescription Post a single photo using a form multipart (multipart/form-data)
 * @apiSuccess {String} data The photo key
 * @apiParam {String} [uid] User's id
 * @apiParam {Number} [latitude] The latitude of the shot
 * @apiParam {Number} [longitude] The longitude of the shot
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/photos?uid=CCq864Wku8damv2C5TaZs4s5cpz2&latitude=41.375395&longitude=2.170624
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "data": "-KcisySBwVA_AevvTJGD"
 * }
 * @apiErrorExample
 * HTTP/1.1 404 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (query)"
 *  }
 */
router.post('/', multer.any(), function (req, res) {
    var validReqQuery = [
        'uid',
        'latitude',
        'longitude'];

    var uid = req.query.uid || 'CCq864Wku8damv2C5TaZs4s5cpz2';
    var latitude = req.query.latitude || 41.375395;
    var longitude = req.query.longitude || 2.170624;

    // Validamos que se reciben parámetros...
    if (Object.keys(req.params).length) {
        debug(config.errors.error400, 'GET/', 'Wrong API call (params)', req.params);
        return res.status(400).json({success: false, error: 'Wrong API call (params)'});
    }

    // Validamos que sólo se reciben los query acordados...
    var queryKeys = Object.keys(req.query);
    for (var j = 0; j < queryKeys.length; j++) {
        if (validReqQuery.indexOf(queryKeys[j]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    const fotosBucket = storage.bucket(efimerumStorageBucket);

    var fotoPath = req.files[0].path;
    var options = {
        maxResults: 100,
        types: ['labels', 'safeSearch'],
        verbose: true
    };
    vision.detect(fotoPath, options, function (err, detections, apiResponse) {
        if (err) {
            fs.unlinkSync(fotoPath);
            res.end('Cloud Vision Error');
        } else {
            if (detections.safeSearch.adult == 'LIKELY' || detections.safeSearch.adult == 'VERY_LIKELY' ||
                detections.safeSearch.spoof == 'LIKELY' || detections.safeSearch.spoof == 'VERY_LIKELY' ||
                detections.safeSearch.medical == 'LIKELY' || detections.safeSearch.medical == 'VERY_LIKELY' ||
                detections.safeSearch.violence == 'LIKELY' || detections.safeSearch.violence == 'VERY_LIKELY') {
                fs.unlinkSync(fotoPath);
                return res.status(400).json({success: false, error: 'Inappropriate content'});
            } else {
                var labels = {};
                var labelsEN = {};
                var labelsES = {};
                var updates = {};
                detections.labels.forEach(function (label) {
                    if (label.score > 75) {
                        labelsEN[label.desc] = true;
                        updates[nodeLabels + '/' + languageEN + '/' + label.desc] = true;

                        // Translates the labels into Spanish
                        translate.translate(label.desc, 'es').then(function (results) {
                            labelsES[results[0]] = true;
                            updates[nodeLabels + '/' + languageES + '/' + results[0]] = true;
                        }).catch(function (error) {
                            console.log('Error trying to translate the label[' + label.desc + '] to spanish: ' + error);
                        });
                    }
                });
                labels[languageEN] = labelsEN;
                labels[languageES] = labelsES;
                fotosBucket.upload(fotoPath, function (err, file) {
                    if (!err) {
                        var photoKey = rootRef.child(nodePhotos).push().key;
                        var imageData = {};
                        imageData['url'] = efimerumStorageBucketPublicURL + '/' + req.files[0].filename;

                        //Obtengo las dimensiones de la imagen y las guardo en el json.
                        var dimensions = sizeOf(fotoPath);
                        imageData['width'] = dimensions.width;
                        imageData['height'] = dimensions.height;
                        var thumbnailData = {};
                        thumbnailData['url'] = efimerumStorageBucketPublicURL + '/' + req.files[0].filename;
                        thumbnailData['width'] = 0;
                        thumbnailData['height'] = 0;

                        var now = moment();
                        var photoData = {
                            creationDate: now.unix(),
                            expirationDate: now.add(1, 'hours').unix(),
                            labels: labels,
                            imageData: imageData,
                            thumbnailData: thumbnailData,
                            latitude: latitude,
                            longitude: longitude,
                            numOfLikes: 0
                        };
                        updates[nodePhotos + '/' + photoKey] = photoData;
                        Object.keys(labelsEN).forEach(function (label) {
                            updates[nodePhotosByLabels + '/' + languageEN + '/' + label + '/' + photoKey] = photoData;
                        });
                        Object.keys(labelsES).forEach(function (label) {
                            updates[nodePhotosByLabels + '/' + languageES + '/' + label + '/' + photoKey] = photoData;
                        });
                        updates[nodePhotosPostedByUsers + '/' + uid + '/' + photoKey] = photoData;
                        rootRef.update(updates)
                            .then(function () {
                                fs.unlinkSync(fotoPath);
                                return res.status(200).json({success: true, data: photoKey});
                            }).catch(function (error) {
                                fs.unlinkSync(fotoPath);
                                fotosBucket.delete(req.files[0].originalname);
                                return res.status(503).json({success: false, error: error});
                        });
                    } else {
                        fs.unlinkSync(fotoPath);
                        return res.status(503).json({success: false, error: err});
                    }
                });
            }
        }
    });
});

// --------------------------------------
// --------------------------------------
module.exports = router;