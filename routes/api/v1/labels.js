'use strict';

var debug = require('debug')('efimerum:labels');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();

const nodeLabels = 'labels';

/**
 * @api {get} /labels
 * @apiGroup Labels
 * @apiDescription Retrieve the list of labels
 * @apiParam {String} [lang] The language required
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/labels
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "data": {
 *       "EN": {
 *          "cartoon": true,
 *          "comic book": true,
 *          "comics": true,
 *          "geological phenomenon": true,
 *          "lake": true,
 *          "mountain": true,
 *          "snow": true,
 *          "weather": true,
 *          "winter": true
 *       }
 *   }
 * }
 * @apiErrorExample
 * HTTP/1.1 500 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (query)"
 *  }
 */
router.get('/', function (req, res) {
    var labelsRef = rootRef.child(nodeLabels);
    labelsRef.once('value')
        .then(function (snap) {
            return res.status(200).json({success: true, data: snap.val()});
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

// --------------------------------------
// --------------------------------------
module.exports = router;