'use strict';

var debug = require('debug')('efimerum:dynamicLinks');
var express = require('express');
var router = express.Router();
var constants = require('./../../../lib/constants');
var request = require('request');

router.post('/', function (req, res) {
    var photoKey = req.body.photoKey;
    if (photoKey === undefined) {
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    var json = {
        "longDynamicLink": constants.firebaseDynamicLinks.firebaseDynamicLinkDomain + "?link=" + constants.firebaseDynamicLinks.efimerumUrl + '/api/v1/photos/' + photoKey +
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