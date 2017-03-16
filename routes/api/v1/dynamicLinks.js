'use strict';

var debug = require('debug')('efimerum:dynamicLinks');
var express = require('express');
var router = express.Router();

var request = require('request');
var firebaseWebApiKey = 'AIzaSyDZcz1tbmPrkSYDOoTOxq4_LIVCjzytSKs';
var firebaseDynamicLinkDomain = 'https://q39as.app.goo.gl/';
var efimerumUrl = 'https://efimerum-48618.appspot.com';
var efimerum_AndroidPackageName = 'com.efimerum.efimerum';
var efimerum_iosBundleId = 'com.charlesmoncada.Efimerum';
var efimerum_iosAppStoreId = '1009116743';

router.post('/', function (req, res) {
    var photoKey = req.body.photoKey;
    if (photoKey === undefined) {
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    var json = {
        "longDynamicLink": firebaseDynamicLinkDomain + "?link=" + efimerumUrl + '/api/v1/photos/' + photoKey +
        "&apn=" + efimerum_AndroidPackageName + "&afl=" + efimerumUrl +
        "&ibi=" + efimerum_iosBundleId + "&isi=" + efimerum_iosAppStoreId + "&ifl=" + efimerumUrl,
        "suffix": {
            "option": "UNGUESSABLE"
        }
    };
    var options = {
        url: 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=' + firebaseWebApiKey,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        json: json
    };

    request(options, function (err, result, body) {
        if (err) {
            return res.status(500).json({success: false, error: err});
        }
        if (result && (result.statusCode === 200 || result.statusCode === 201)) {
            return res.status(200).json({success: true, data: 'Dynamic link creado...' + body.shortLink});
        }
    });
});

// --------------------------------------
// --------------------------------------
module.exports = router;