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
var lwip = require('lwip');
var sizeOf = require('image-size');

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
 * @apiDescription Post a single photo using a form multipart (multipart/form-data)
 * @apiSuccess {String} data The photo key
 * @apiParam {String} uid User's id
 * @apiParam {Number} latitude The latitude of the user performing the action
 * @apiParam {Number} longitude The latitude of the user performing the action
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
/*
 1) Realizamos el SafeSearch y la detección de etiquetas
 2) Realizamos la traducción de las etiquetas que superen un umbral de 75 puntos
 3) Subimos la imagen al storage
 4) Creamos el thumbnail de la imagen
 5) Subimos el thumbnail de la imagen al storage
 6) Generamos los nodos en la BBDD de Firebase
 */
router.post('/', multer.any(), function (req, res) {
    var validReqQuery = [
        'idToken',
        'latitude',
        'longitude'];

    var idToken = req.query.idToken || 'asdasd123wedcsd';
    var latitude = req.query.latitude || 41.375395; // TODO: qué se hace si no viene info de geolocalización???
    var longitude = req.query.longitude || 2.170624;

    // Validamos que se reciben parámetros...
    if (Object.keys(req.params).length) {
        return res.status(400).json({success: false, error: 'Wrong API call (params)'});
    }

    // Validamos que sólo se reciben los query acordados...
    var queryKeys = Object.keys(req.query);
    for (var j = 0; j < queryKeys.length; j++) {
        if (validReqQuery.indexOf(queryKeys[j]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    // var auth = firebase.auth();
    var uid = req.query.uid || 'CCq864Wku8damv2C5TaZs4s5cpz2';
    // firebase.auth().verifyIdToken(idToken)
    //     .then(function (decodedToken) {
    //         uid = decodedToken.sub;
    //     });

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

        // 2) Realizamos la traducción de las etiquetas que superen un umbral de 75 puntos
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
            lwip.open(photoPath, function (err, image) {
                if (err) {
                    processErrorInPostPhoto(err, 'Error when open the image!', fotosBucket,
                        photoPath, photoFilename, true, true,
                        null, null, false, false);
                    return res.status(500).json({success: false, error: 'Error when open the image!'});
                }
                image.scale(0.35, function (err, image) {
                    if (err) {
                        processErrorInPostPhoto(err, 'Error when scale the image!', fotosBucket,
                            photoPath, photoFilename, true, true,
                            null, null, false, false);
                        return res.status(500).json({success: false, error: 'Error when scale the image!'});
                    }
                    var photoSplitedByDot = photoPath.split('.');
                    var thumbnailPath = photoSplitedByDot[0] + '_thumb.' + photoSplitedByDot[photoSplitedByDot.length - 1];
                    var thumbnailSplitedBySlash = thumbnailPath.split('/');
                    var thumbnailFilename = thumbnailSplitedBySlash[thumbnailSplitedBySlash.length - 1];
                    image.writeFile(thumbnailPath, function (err) {
                        if (err) {
                            processErrorInPostPhoto(err, 'Error when save the scaled image!', fotosBucket,
                                photoPath, photoFilename, true, true,
                                null, null, false, false);
                            return res.status(500).json({
                                success: false, error: 'Error when save the scaled image!'
                            });
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
                            var thumbnailData = {};
                            thumbnailData['url'] = efimerumStorageBucketPublicURL + '/' + thumbnailFilename;
                            var dimensionsThumbnail = sizeOf(thumbnailPath);
                            thumbnailData['width'] = dimensionsThumbnail.width;
                            thumbnailData['height'] = dimensionsThumbnail.height;

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
                                owner: uid
                            };
                            updates[nodePhotos + '/' + photoKey] = photoData;
                            Object.keys(labelsEN).forEach(function (label) {
                                updates[nodePhotosByLabel + '/' + languageEN + '/' + label + '/' + photoKey] = photoData;
                            });
                            updates[nodePhotosPostedByUser + '/' + uid + '/' + photoKey] = photoData;
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
                });
            });
        });
    });
});

// --------------------------------------
// --------------------------------------
module.exports = router;