'use strict';

var debug = require('debug')('efimerum:photos');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var constants = require('./../../../lib/constants');
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
var GeoFire = require('geofire');
var geoFire = new GeoFire(rootRef.child(constants.firebaseNodes.geoFirePhotos));
var request = require('request');

router.get('/json', function (req, res) {
    var photosRef = rootRef.child(constants.firebaseNodes.photos);
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
 * @api {get} /photos/:photoKey
 * @apiGroup Photos
 * @apiDescription Used to know if a photo is alive
 * @apiParam {String} photoKey Photo identifier
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/photos/XXyXX
 */
router.get('/:id', function (req, res) {
    if (req.params.id === undefined) {
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }
    var photoKey = req.params.id;
    var _photoRef = rootRef.child(constants.firebaseNodes._photos + '/' + photoKey);
    _photoRef.once('value')
        .then(function (snap) {
            var _photo = snap.val();
            if (_photo != null) {
                return res.redirect('/alive');
            } else {
                return res.redirect('/dead');
            }
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
 * @apiParam {Number} [latitude] The latitude of the user performing the action
 * @apiParam {Number} [longitude] The latitude of the user performing the action
 * @apiParam {String} [labels] Photo's labels separated by comma (',')
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/photos
 *
 *     body:
 *     {
 *       "idToken": "XXyXX",
 *       "latitude": 41.375395,
 *       "longitude": 2.170624,
 *       "labels": "Line art, Beach, Vampires"
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
 1) Procesamos las etiquetas
 1.a) Como se reciben... esto hará que no se consulte el API de Google Cloud Vision. Está pensado para TESTing!!!
 1.b) Realizamos el SafeSearch y la detección de etiquetas. Esto quiere decir que NO se han recibido labels en la petición
 1.b.I) Nos quedamos con las etiquetas que superen un umbral de 75 puntos (aquí iría la traducción de labels)
 2) Procesamos las coordenadas... si se reciben
 3) Subimos la imagen al storage
 4) Creamos el thumbnail de la imagen
 5) Subimos el thumbnail de la imagen al storage
 6) Obtenemos el Firebase Dynamic Link de la foto
 7) Generamos los nodos en la BBDD de Firebase
 8) Persistimos en la BBDD de Firebase todos los nodos generados
 9) Persistimos en la BBDD de Firebase la info de GeoFire
 10) Propagar la info de Geofire a todos los nodos donde está la foto
 */
router.post('/', multer.any(), firebaseAuth(), function (req, res) {
    var uid = req.uid || 'batman';
    var labelsEN = {};
    var updates = {};

    // 1) Procesamos las etiquetas
    var bodyLabels = req.body.labels;
    if (typeof bodyLabels !== 'undefined' && bodyLabels.trim().length > 0) {
        // 1.a) Como se reciben... esto hará que no se consulte el API de Google Cloud Vision. Está pensado para TESTing!!!

        var bodyLabelsArray = bodyLabels.split(',');
        bodyLabelsArray.forEach(function (bodyLabel) {
            var bodyLabelTrimed = bodyLabel.trim();
            labelsEN[bodyLabelTrimed] = bodyLabelTrimed;
            updates[constants.firebaseNodes.labels + '/' + constants.firebaseNodes.languageEN + '/' + bodyLabelTrimed] = bodyLabelTrimed;
        });

        firebaseAndGoogleCloudPlatformStuff(req, res, labelsEN, updates);

    } else {
        // 1.b) Realizamos el SafeSearch y la detección de etiquetas. Esto quiere decir que NO se han recibido labels en la petición

        var photoPath = req.files[0].path;
        var options = {
            maxResults: 100,
            types: ['labels', 'safeSearch'],
            verbose: true
        };
        vision.detect(photoPath, options, function (err, detections, apiResponse) {
            if (err) {
                logError('POST photos', 'Cloud Vision Error with uid: ' + uid + ', Error: ' + err);
                detections = {labels: [{desc: constants.googleCloudVision.defaultLabel, score: 100}]};
            }

            if (detections.safeSearch.adult == 'LIKELY' || detections.safeSearch.adult == 'VERY_LIKELY' ||
                detections.safeSearch.spoof == 'LIKELY' || detections.safeSearch.spoof == 'VERY_LIKELY' ||
                detections.safeSearch.medical == 'LIKELY' || detections.safeSearch.medical == 'VERY_LIKELY' ||
                detections.safeSearch.violence == 'LIKELY' || detections.safeSearch.violence == 'VERY_LIKELY') {
                fs.unlinkSync(photoPath);
                logError('POST photos', 'Inappropriate content');
                return res.status(500).json({success: false, error: 'Inappropriate content'});
            }

            var bodyLabels = req.body.labels;
            if (typeof bodyLabels !== 'undefined' && bodyLabels.trim().length > 0) {
                var bodyLabelsArray = bodyLabels.split(',');
                bodyLabelsArray.forEach(function (bodyLabel) {
                    var bodyLabelTrimed = bodyLabel.trim();
                    labelsEN[bodyLabelTrimed] = bodyLabelTrimed;
                    updates[constants.firebaseNodes.labels + '/' + constants.firebaseNodes.languageEN + '/' + bodyLabelTrimed] = bodyLabelTrimed;
                });
            }

            // 1.b.I) Nos quedamos con las etiquetas que superen un umbral de 75 puntos (aquí iría la traducción de labels)
            detections.labels.forEach(function (label) {
                if (label.score > constants.googleCloudVision.defaultThreshold) {
                    labelsEN[label.desc] = label.desc;
                    updates[constants.firebaseNodes.labels + '/' + constants.firebaseNodes.languageEN + '/' + label.desc] = label.desc;
                }
            });
            if (Object.keys(labelsEN).length === 0) {
                labelsEN[constants.googleCloudVision.defaultLabel] = constants.googleCloudVision.defaultLabel;
            }

            firebaseAndGoogleCloudPlatformStuff(req, res, labelsEN, updates);
        });
    }
});

function firebaseAndGoogleCloudPlatformStuff(req, res, labelsEN, updates) {
    var uid = req.uid || 'batman';

    // 2) Procesamos las coordenadas... si se reciben
    var bFlagCoordinates = false;
    var bodyLatitude = req.body.latitude;
    var bodyLongitude = req.body.longitude;
    var latitude = 0;
    var longitude = 0;
    if (typeof bodyLatitude !== 'undefined' && bodyLatitude.trim().length > 0 &&
        typeof bodyLongitude !== 'undefined' && bodyLongitude.trim().length > 0) {
        bFlagCoordinates = true;
        latitude = Number(bodyLatitude);
        longitude = Number(bodyLongitude);
    }

    var photoPath = req.files[0].path;
    var photoFilename = req.files[0].filename;
    const fotosBucket = storage.bucket(constants.googleCloudStorage.efimerumStorageBucket);

    var labels = {};

    labels[constants.firebaseNodes.languageEN] = labelsEN;

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

                    // 6) Obtenemos el Firebase Dynamic Link de la foto
                    var photoKey = rootRef.child(constants.firebaseNodes.photos).push().key;
                    var json = {
                        "longDynamicLink": constants.firebaseDynamicLinks.firebaseDynamicLinkDomain + "?link=" + constants.firebaseDynamicLinks.efimerumPhotosUrl + '/' + photoKey +
                        "&apn=" + constants.firebaseDynamicLinks.efimerum_AndroidPackageName + "&afl=" + constants.firebaseDynamicLinks.efimerumUrl +
                        "&ibi=" + constants.firebaseDynamicLinks.efimerum_iosBundleId + "&isi=" + constants.firebaseDynamicLinks.efimerum_iosAppStoreId + "&ifl=" + constants.firebaseDynamicLinks.efimerumUrl,
                        "suffix": {
                            "option": "UNGUESSABLE"
                        }
                    };
                    var options = {
                        url: constants.firebaseDynamicLinks.firebaseDynamiclinksApiUrl + constants.firebaseDynamicLinks.firebaseWebApiKey,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        json: json
                    };
                    request(options, function (err, result, body) {
                        if (err) {
                            processErrorInPostPhoto(err, 'Error generating Firebase Dynamic Link', fotosBucket,
                                photoPath, photoFilename, true, true,
                                thumbnailPath, thumbnailFilename, true, true);
                            return res.status(500).json({success: false, error: err});
                        }
                        if (!(result && (result.statusCode === 200 || result.statusCode === 201))) {
                            processErrorInPostPhoto(err, 'Error generating Firebase Dynamic Link', fotosBucket,
                                photoPath, photoFilename, true, true,
                                thumbnailPath, thumbnailFilename, true, true);
                            return res.status(500).json({
                                success: false,
                                error: 'Error generating Firebase Dynamic Link'
                            });
                        }

                        // 7) Generamos los nodos en la BBDD de Firebase
                        var imageData = {};
                        imageData['url'] = constants.googleCloudStorage.efimerumStorageBucketPublicURL + '/' + photoFilename;
                        var dimensions = {};
                        var dimensionsThumbnail = {};
                        try {
                            dimensions = sizeOf(photoPath);
                            dimensionsThumbnail = sizeOf(thumbnailPath);
                        } catch (err) {
                            processErrorInPostPhoto(err, 'Error getting the dimensions of the image and thumbnail', fotosBucket,
                                photoPath, photoFilename, true, true,
                                thumbnailPath, thumbnailFilename, true, true);
                            return res.status(500).json({
                                success: false,
                                error: 'Error getting the dimensions of the image and thumbnail'
                            });
                        }

                        imageData['width'] = dimensions.width;
                        imageData['height'] = dimensions.height;
                        imageData['fileName'] = photoFilename;
                        var thumbnailData = {};
                        thumbnailData['url'] = constants.googleCloudStorage.efimerumStorageBucketPublicURL + '/' + thumbnailFilename;
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
                            numOfLikes: 0,
                            owner: uid,
                            md5: md5(photoFilename),
                            sha1: sha1(photoFilename),
                            sha256: sha256(photoFilename),
                            randomString: randomstring.generate(),
                            dynamicLink: body.shortLink
                        };

                        if (bFlagCoordinates) {
                            photoData.latitude = latitude;
                            photoData.longitude = longitude;
                        }

                        updates[constants.firebaseNodes.photos + '/' + photoKey] = photoData;
                        Object.keys(labelsEN).forEach(function (label) {
                            updates[constants.firebaseNodes.photosByLabel + '/' + constants.firebaseNodes.languageEN + '/' + label + '/' + photoKey] = photoData;
                        });
                        updates[constants.firebaseNodes.photosPostedByUser + '/' + uid + '/' + photoKey] = photoData;
                        updates[constants.firebaseNodes._photos + '/' + photoKey] = photoData;

                        // 8) Persistimos en la BBDD de Firebase todos los nodos generados
                        rootRef.update(updates)
                            .then(function () {
                                fs.unlink(photoPath, function (err) {
                                    if (err) {
                                        return logError('POST photos', '.............unlink photoPath: ' + photoPath + ', Error: ' + error + '....with photoKey: ' + photoKey);
                                    }
                                });
                                fs.unlink(thumbnailPath, function (err) {
                                    if (err) {
                                        return logError('POST photos', '.............unlink thumbnailPath: ' + thumbnailPath + ', Error: ' + error + '....with photoKey: ' + photoKey);
                                    }
                                });

                                // 9) Persistimos en la BBDD de Firebase la info de GeoFire
                                if (bFlagCoordinates) {
                                    geoFire.set(photoKey, [latitude, longitude]).then(function () {

                                        // 10) Propagar la info de Geofire a todos los nodos donde está la foto
                                        var photoGeoRef = rootRef.child(constants.firebaseNodes.geoFirePhotos + '/' + photoKey);
                                        photoGeoRef.once('value')
                                            .then(function (snap) {
                                                var photoGeo = snap.val();
                                                updates = {};
                                                var keys = Object.keys(photoGeo);
                                                keys.forEach(function (entry) {
                                                    updates[constants.firebaseNodes.photos + '/' + photoKey + '/' + entry] = photoGeo[entry];
                                                    Object.keys(labelsEN).forEach(function (label) {
                                                        updates[constants.firebaseNodes.photosByLabel + '/' + constants.firebaseNodes.languageEN + '/' + label + '/' + photoKey + '/' + entry] = photoGeo[entry];
                                                    });
                                                    updates[constants.firebaseNodes.photosPostedByUser + '/' + uid + '/' + photoKey + '/' + entry] = photoGeo[entry];
                                                    updates[constants.firebaseNodes._photos + '/' + photoKey + '/' + entry] = photoGeo[entry];
                                                });
                                                rootRef.update(updates)
                                                    .then(function () {
                                                        return res.status(200).json({
                                                            success: true,
                                                            data: photoKey
                                                        });
                                                    })
                                                    .catch(function (error) {
                                                        logError('POST photos', '.............GeoFire propagation-update Error: ' + error + '....with photoKey: ' + photoKey);
                                                        return res.status(500).json({success: false, error: error});
                                                    });
                                            })
                                            .catch(function (error) {
                                                logError('POST photos', '.............GeoFire propagation Error: ' + error + '....with photoKey: ' + photoKey);
                                            });
                                    }).catch(function (error) {
                                        logError('POST photos', '.............GeoFire Error: ' + error + '....with photoKey: ' + photoKey);
                                        return res.status(500).json({
                                            success: false,
                                            error: 'Photo added without GeoFire info!'
                                        });
                                    });
                                } else {
                                    return res.status(200).json({success: true, data: photoKey});
                                }
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
        }, function (err) {
            processErrorInPostPhoto(err, 'Error when create thumbnail!', fotosBucket,
                photoPath, photoFilename, true, true,
                null, null, false, false);
            return res.status(500).json({success: false, error: 'Error when create thumbnail!'});
        });
    });

}

// --------------------------------------
// --------------------------------------
module.exports = router;