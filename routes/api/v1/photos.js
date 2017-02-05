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

router.get('/', function (req, res) {
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

            return res.status(200).json({success: true, data: snapShuffled });
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

router.post('/', multer.any(), function (req, res) {
    const fotosBucket = storage.bucket('efimerum-fotos');
    var fotoPath = req.files[0].path;

    var types = ['labels'];
    vision.detect(fotoPath, types, function(err, detections, apiResponse) {
        if (err) {
            res.end('Cloud Vision Error');
        } else {

            fotosBucket.upload(fotoPath, function (err, file) {
                if (!err) {

                    var photosRef = rootRef.child('photos');
                    var photoKey = photosRef.push().key;
                    var photoData = {
                        originalName: req.files[0].originalname,
                        creationDate: moment().format(),
                        fileName: req.files[0].filename,
                        tags: detections,
                        url: 'https://storage.googleapis.com/efimerum-fotos/' + req.files[0].filename
                    };
                    var updates = {};
                    updates[photoKey] = photoData;
                    photosRef.update(updates)
                        .then(function () {
                            fs.unlinkSync(fotoPath);
                            return res.status(200).json({success: true, data: photoData});
                        }).catch(function (error) {
                        fotosBucket.delete(req.files[0].originalname);
                        return res.status(500).json({success: false, error: error});
                    });
                } else {
                    return res.status(500).json({success: false, error: err});
                }
            });
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
                .then(function() {
                    // Borrar de la BBDD
                    photoRef.remove(function (error) {
                        if (!error) {
                            return res.status(200).json({success: true, data: {fotoFirebaseID: fotoFirebaseID, photoNameInStorage: photoNameInStorage}});
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