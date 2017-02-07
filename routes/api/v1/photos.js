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
var multer = require('./../../../lib/utils').multer;
var moment = require('moment');

router.get('/json', function (req, res) {
    var user = firebase.auth().currentUser;
    if (user) {
        console.log('User is signed in', user);
    } else {
        console.log('No user is signed in');
    }

    var photosRef = rootRef.child('photos');
    photosRef.once('value')
        .then(function (snap) {
            var snapShuffled = shuffleFirebaseSnapshot(snap);
            return res.status(200).json({success: true, data: snapShuffled});
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

router.get('/', function (req, res) {
    var user = firebase.auth().currentUser;
    if (user) {
        console.log('User is signed in', user);
    } else {
        console.log('No user is signed in');
    }

    var photosRef = rootRef.child('photos');
    return res.status(200).json({success: true, data: photosRef.toString()});
});

router.post('/', multer.any(), function (req, res) {
    const fotosBucket = storage.bucket('efimerum-fotos');
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
                return res.status(500).json({success: false, error: 'Inappropriate content'});
            } else {
                var labels = {};
                var updates = {};
                detections.labels.forEach(function (label) {
                    if (label.score > 75) {
                        labels[label.desc] = true;
                        updates['labels/' + label.desc] = true;
                    }
                });
                fotosBucket.upload(fotoPath, function (err, file) {
                    if (!err) {
                        var photoKey = rootRef.child('photos').push().key;
                        var photoData = {
                            originalName: req.files[0].originalname,
                            creationDate: moment().format(),
                            fileName: req.files[0].filename,
                            labels: labels,
                            url: 'https://storage.googleapis.com/efimerum-fotos/' + req.files[0].filename
                        };
                        updates['photos/' + photoKey] = photoData;
                        rootRef.update(updates)
                            .then(function () {
                                fs.unlinkSync(fotoPath);
                                return res.status(200).json({success: true, data: photoData});
                            }).catch(function (error) {
                                fs.unlinkSync(fotoPath);
                                fotosBucket.delete(req.files[0].originalname);
                                return res.status(500).json({success: false, error: error});
                        });
                    } else {
                        fs.unlinkSync(fotoPath);
                        return res.status(500).json({success: false, error: err});
                    }
                });
            }
        }
    });
});

router.delete('/', function (req, res) {
    var fotoFirebaseID = req.query.fotoFirebaseID;
    if (fotoFirebaseID == null) {
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    var photosRef = rootRef.child('photos');
    var photoRef = photosRef.child(fotoFirebaseID);
    photoRef.once('value')
        .then(function (snap) {
            // Borrar del Storage
            var fotosBucket = storage.bucket('efimerum-fotos');
            var photoNameInStorage = snap.val().fileName;
            var foto = fotosBucket.file(photoNameInStorage);
            foto.delete()
                .then(function () {
                    // Borrar de la BBDD
                    photoRef.remove(function (error) {
                        if (!error) {
                            return res.status(200).json({
                                success: true,
                                data: {fotoFirebaseID: fotoFirebaseID, photoNameInStorage: photoNameInStorage}
                            });
                        } else {
                            return res.status(500).json({success: false, error: error});
                        }
                    });
                })
                .catch(function (err) {
                    return res.status(500).json({success: false, error: err});
                });
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});


// --------------------------------------
// --------------------------------------
module.exports = router;