'use strict';

var debug = require('debug')('efimerum:photos');
var express = require('express');
var router = express.Router();
var fs = require('fs');

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var shuffleFirebaseSnapshot = require('./../../../lib/utils').shuffleFirebaseJSON;
var processErrorInPostPhoto = require('./../../../lib/utils').processErrorInPostPhoto;
var storage = require('./../../../lib/googleCloudPlatform.js').storage;
var vision = require('./../../../lib/googleCloudPlatform').vision;
var multer = require('./../../../lib/utils').multer;
var moment = require('moment');
var thumbnailsCreator = require('lwip-image-thumbnails-creator');
var sizeOf = require('image-size');
var md5 = require('md5');
var sha1 = require('sha1');
var sha256 = require('sha256');
var randomstring = require('randomstring');
var firebaseAuth = require('../../../lib/firebaseAuth.js');

const nodePhotos = 'photos';
const nodeLabels = 'labels';
const nodePhotosByLabel = 'photosByLabel';
const nodePhotosPostedByUser = 'photosPostedByUser';
const languageEN = 'EN';
const efimerumStorageBucket = 'efimerum-photos';
const efimerumStorageBucketPublicURL = 'https://storage.googleapis.com/efimerum-photos';

router.get('/json', function (req, res) {
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
 * @api {post} /photos
 * @apiGroup Photos
 * @apiDescription Post a single photo using a form multipart (multipart/form-data). Only jpeg and png are accepted.
 * @apiSuccess {String} data The photo key
 * @apiParam {String} idToken User's ID token
 * @apiParam {Number} latitude The latitude of the user performing the action
 * @apiParam {Number} longitude The latitude of the user performing the action
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/photos?idToken=XXyXX&latitude=41.375395&longitude=2.170624
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
/*
 0) Validamos que sólo se reciben los query acordados
 1) Realizamos el SafeSearch y la detección de etiquetas
 2) Nos quedamos con las etiquetas que superen un umbral de 75 puntos (aquí iría la traducción de labels)
 3) Subimos la imagen al storage
 4) Creamos el thumbnail de la imagen
 5) Subimos el thumbnail de la imagen al storage
 6) Generamos los nodos en la BBDD de Firebase
 7) Persistimos en la BBDD de Firebase los nodos generados
 */
router.post('/', firebaseAuth(), multer.any(), function (req, res) {
    var validReqQuery = [
        'idToken',
        'latitude',
        'longitude'];

    // 0) Validamos que sólo se reciben los query acordados
    var queryKeys = Object.keys(req.query);
    for (var j = 0; j < queryKeys.length; j++) {
        if (validReqQuery.indexOf(queryKeys[j]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    var uid = req.uid || 'batman';
    var latitude = req.query.latitude; // TODO: qué se hace si no viene info de geolocalización???
    var longitude = req.query.longitude;
    var photoPath = req.files[0].path;
    var photoFilename = req.files[0].filename;
    const fotosBucket = storage.bucket(efimerumStorageBucket);

    // 1) Realizamos el SafeSearch y la detección de etiquetas
    var options = {
        maxResults: 100,
        types: ['labels', 'safeSearch'],
        verbose: true
    };
    vision.detect(photoPath, options, function (err, detections, apiResponse) {
        if (err) {
            processErrorInPostPhoto(err, 'Cloud Vision Error', fotosBucket,
                photoPath, photoFilename, true, false,
                null, null, false, false);
            return res.status(500).json({success: false, error: 'Cloud Vision Error'});
        }

        if (detections.safeSearch.adult == 'LIKELY' || detections.safeSearch.adult == 'VERY_LIKELY' ||
            detections.safeSearch.spoof == 'LIKELY' || detections.safeSearch.spoof == 'VERY_LIKELY' ||
            detections.safeSearch.medical == 'LIKELY' || detections.safeSearch.medical == 'VERY_LIKELY' ||
            detections.safeSearch.violence == 'LIKELY' || detections.safeSearch.violence == 'VERY_LIKELY') {
            console.log('Inappropriate content');
            fs.unlinkSync(photoPath);
            return res.status(500).json({success: false, error: 'Inappropriate content'});
        }

        // 2) Nos quedamos con las etiquetas que superen un umbral de 75 puntos (aquí iría la traducción de labels)
        var labels = {};
        var labelsEN = {};
        var updates = {};
        detections.labels.forEach(function (label) {
            if (label.score > 75) {
                labelsEN[label.desc] = true;
                updates[nodeLabels + '/' + languageEN + '/' + label.desc] = true;
            }
        });
        labels[languageEN] = labelsEN;

        // 3) Subimos la imagen al storage
        fotosBucket.upload(photoPath, function (err, file) {
            if (err) {
                processErrorInPostPhoto(err, 'Error storing the image in Google Cloud Storage', fotosBucket,
                    photoPath, photoFilename, true, false,
                    null, null, false, false);
                return res.status(500).json({success: false, error: err});
            }

            // 4) Creamos el thumbnail de la imagen
            var options = {
                saveToDisk: false
            };
            thumbnailsCreator.createThumbnail(photoPath, {
                maxWidth: 300,
                maxHeight: 300
            }, options).then(function (resp) {
                var photoSplitedByDot = photoPath.split('.');
                var thumbnailPath = photoSplitedByDot[0] + '_thumb.' + photoSplitedByDot[photoSplitedByDot.length - 1];
                var thumbnailSplitedBySlash = thumbnailPath.split('/');
                var thumbnailFilename = thumbnailSplitedBySlash[thumbnailSplitedBySlash.length - 1];
                resp.thumbnail.image.writeFile(thumbnailPath, function (err) {
                    if (err) {
                        processErrorInPostPhoto(err, 'Error writeFile Thumbnail', fotosBucket,
                            photoPath, photoFilename, true, true,
                            thumbnailPath, null, true, false);
                        return res.status(500).json({success: false, error: err});
                    }
                    // 5) Subimos el thumbnail de la imagen al storage
                    fotosBucket.upload(thumbnailPath, function (err, file) {
                        if (err) {
                            processErrorInPostPhoto(err, 'Error storing the thumbnail in Google Cloud Storage', fotosBucket,
                                photoPath, photoFilename, true, true,
                                thumbnailPath, null, true, false);
                            return res.status(500).json({success: false, error: err});
                        }

                        // 6) Generamos los nodos en la BBDD de Firebase
                        var photoKey = rootRef.child(nodePhotos).push().key;
                        var imageData = {};
                        imageData['url'] = efimerumStorageBucketPublicURL + '/' + photoFilename;
                        var dimensions = sizeOf(photoPath);
                        imageData['width'] = dimensions.width;
                        imageData['height'] = dimensions.height;
                        imageData['fileName'] = photoFilename;
                        var thumbnailData = {};
                        thumbnailData['url'] = efimerumStorageBucketPublicURL + '/' + thumbnailFilename;
                        var dimensionsThumbnail = sizeOf(thumbnailPath);
                        thumbnailData['width'] = dimensionsThumbnail.width;
                        thumbnailData['height'] = dimensionsThumbnail.height;
                        thumbnailData['fileName'] = thumbnailFilename;

                        var now = moment();
                        var photoData = {
                            creationDate: now.unix(),
                            expirationDate: now.add(1, 'hours').unix(),
                            labels: labels,
                            imageData: imageData,
                            thumbnailData: thumbnailData,
                            latitude: latitude,
                            longitude: longitude,
                            numOfLikes: 0,
                            owner: uid,
                            md5: md5(photoFilename),
                            sha1: sha1(photoFilename),
                            sha256: sha256(photoFilename),
                            randomString: randomstring.generate()
                        };

                        updates[nodePhotos + '/' + photoKey] = photoData;
                        Object.keys(labelsEN).forEach(function (label) {
                            updates[nodePhotosByLabel + '/' + languageEN + '/' + label + '/' + photoKey] = photoData;
                        });
                        updates[nodePhotosPostedByUser + '/' + uid + '/' + photoKey] = photoData;

                        // 7) Persistimos en la BBDD de Firebase todos los nodos generados
                        rootRef.update(updates)
                            .then(function () {
                                fs.unlinkSync(photoPath);
                                fs.unlinkSync(thumbnailPath);
                                return res.status(200).json({success: true, data: photoKey});
                            })
                            .catch(function (error) {
                                processErrorInPostPhoto(error, 'Error updating in Firebase', fotosBucket,
                                    photoPath, photoFilename, true, true,
                                    thumbnailPath, thumbnailFilename, true, true);
                                return res.status(500).json({success: false, error: error});
                            });
                    });
                });
            }, function (err) {
                processErrorInPostPhoto(err, 'Error when create thumbnail!', fotosBucket,
                    photoPath, photoFilename, true, true,
                    null, null, false, false);
                return res.status(500).json({success: false, error: 'Error when create thumbnail!'});
            });
        });
    });
});

// --------------------------------------
// --------------------------------------
module.exports = router;