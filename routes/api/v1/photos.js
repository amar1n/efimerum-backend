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

const nodePhotosRequestedByUsers = 'nodePhotosRequestedByUsers';
const nodePhotos = 'photos';
const nodeLabels = 'labels';
const nodePhotosByLabels = 'photosByLabels';
const nodePhotosPostedByUsers = 'photosPostedByUsers';
const languageEN = 'EN';
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
            var updates = {};
            updates[nodePhotosRequestedByUsers + '/' + uid] = snapShuffled;
            rootRef.update(updates)
                .then(function () {
                    return res.status(200).json({success: true, data: rootRef.toString() + nodePhotosRequestedByUsers + '/' + uid });
                }).catch(function (error) {
                    return res.status(500).json({success: false, error: error});
                });
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

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
                return res.status(500).json({success: false, error: 'Inappropriate content'});
            } else {
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
                fotosBucket.upload(fotoPath, function (err, file) {
                    if (!err) {
                        var photoKey = rootRef.child(nodePhotos).push().key;
                        var imageData = {};
                        imageData['url'] = efimerumStorageBucketPublicURL + '/' + req.files[0].filename;
                        imageData['width'] = 0;
                        imageData['height'] = 0;
                        var thumbnailData = {};
                        thumbnailData['url'] = efimerumStorageBucketPublicURL + '/' + req.files[0].filename;
                        thumbnailData['width'] = 0;
                        thumbnailData['height'] = 0;
                        var photoData = {
                            creationDate: moment().format(),
                            labels: labels,
                            imageData: imageData,
                            thumbnailData: thumbnailData,
                            latitude: latitude,
                            longitude: longitude
                        };
                        updates[nodePhotos + '/' + photoKey] = photoData;
                        Object.keys(labelsEN).forEach(function (label) {
                            updates[nodePhotosByLabels + '/' + languageEN + '/' + label + '/' + photoKey] = photoData;
                        });
                        updates[nodePhotosPostedByUsers + '/' + uid + '/' + photoKey] = photoData;
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

// --------------------------------------
// --------------------------------------
module.exports = router;