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
var logError = require('./../../../lib/utils').logError;
var validateReqDataKeys = require('./../../../lib/utils').validateReqDataKeys;

const node_Photos = '_photos';
const nodePhotos = 'photos';
const nodeLabels = 'labels';
const nodePhotosByLabel = 'photosByLabel';
const nodePhotosPostedByUser = 'photosPostedByUser';
const nodeGeoFirePhotos = 'geofirePhotos';
const languageEN = 'EN';
const efimerumStorageBucket = 'efimerum-photos';
const efimerumStorageBucketPublicURL = 'https://storage.googleapis.com/efimerum-photos';

var GeoFire = require('geofire');
var geoFire = new GeoFire(rootRef.child(nodeGeoFirePhotos));

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
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/photos
 *
 *     body:
 *     {
 *       "idToken": "XXyXX",
 *       "latitude": 41.375395,
 *       "longitude": 2.170624
 *     }
 *
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
 Este endpoint toca los siguientes nodos en Firebase...
 - _photos: Crea una foto para uso interno del backend. Esta foto tendrá todas los likes dentro
 - geofirePhotos: Crea la info de geolocalización de la foto usando GeoFire, para que los dispositivos puedan hacer búsquedas de fotos por distancia
 - photos: Crea una foto, para que los dispositivos puedan hacer búsquedas aleatorias
 - photosByLabel: Relaciona la foto con sus etiquetas, para que los dispositivos puedan hacer búsquedas de fotos por etiqueta
 - photosPostedByUser: Relaciona la foto con el usuario que la creo, para que los dispositivos puedan mostrar las fotos subidas por usuario

 Este endpoint realiza las siguientes acciones...
 0) Validamos que se reciben los parámetros acordados
 1) Realizamos el SafeSearch y la detección de etiquetas
 2) Nos quedamos con las etiquetas que superen un umbral de 75 puntos (aquí iría la traducción de labels)
 3) Subimos la imagen al storage
 4) Creamos el thumbnail de la imagen
 5) Subimos el thumbnail de la imagen al storage
 6) Generamos los nodos en la BBDD de Firebase
 7) Persistimos en la BBDD de Firebase todos los nodos generados
 8) Persistimos en la BBDD de Firebase la info de GeoFire
 */
router.post('/', multer.any(), firebaseAuth(), function (req, res) {
    var validReqBody = [
        'latitude',
        'longitude'];

    // 0) Validamos que se reciben los parámetros acordados
    var bodyKeys = Object.keys(req.body);
    var bFlag = validateReqDataKeys(validReqBody, bodyKeys);
    if (!bFlag) {
        logError('POST photos', 'Wrong API call (query)');
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    var uid = req.uid || 'batman';
    var latitude = Number(req.body.latitude); // TODO: qué se hace si no viene info de geolocalización???
    var longitude = Number(req.body.longitude);
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
            logError('POST photos', 'Cloud Vision Error with uid: ' + uid + ', Error: ' + err);
            detections = {labels: [{desc: 'Who knows...', score: 100}]};
        }

        if (detections.safeSearch.adult == 'LIKELY' || detections.safeSearch.adult == 'VERY_LIKELY' ||
            detections.safeSearch.spoof == 'LIKELY' || detections.safeSearch.spoof == 'VERY_LIKELY' ||
            detections.safeSearch.medical == 'LIKELY' || detections.safeSearch.medical == 'VERY_LIKELY' ||
            detections.safeSearch.violence == 'LIKELY' || detections.safeSearch.violence == 'VERY_LIKELY') {
            fs.unlinkSync(photoPath);
            logError('POST photos', 'Inappropriate content');
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
                        updates[node_Photos + '/' + photoKey] = photoData;

                        // 7) Persistimos en la BBDD de Firebase todos los nodos generados
                        rootRef.update(updates)
                            .then(function () {
                                fs.unlinkSync(photoPath);
                                fs.unlinkSync(thumbnailPath);

                                // 8) Persistimos en la BBDD de Firebase la info de GeoFire
                                geoFire.set(photoKey, [latitude, longitude]).then(function () {
                                    return res.status(200).json({success: true, data: photoKey});
                                }).catch(function (error) {
                                    logError('POST photos', '.............GeoFire Error: ' + error + '....with photoKey: ' + photoKey);
                                    return res.status(500).json({
                                        success: false,
                                        error: 'Photo added without GeoFire info!'
                                    });
                                });
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