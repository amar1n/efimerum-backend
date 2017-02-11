'use strict';

var debug = require('debug')('efimerum:labels');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();

const nodeLabels = 'labels';
const languageEN = 'EN';
const languageES = 'ES';

/**
 * @api {get} /labels
 * @apiGroup Labels
 * @apiDescription Retrieve the list of labels
 * @apiParam {String} [lang] The language required
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/labels?lang=EN
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
 * HTTP/1.1 400 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (language)"
 *  }
 */
router.get('/', function (req, res) {
    var validReqQuery = [
        'lang'];

    var lang = req.query.lang;

    // Validamos que sólo se reciben los query acordados...
    var queryKeys = Object.keys(req.query);
    for (var i = 0; i < queryKeys.length; i++) {
        if (validReqQuery.indexOf(queryKeys[i]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    var labelsRef = '';
    // Procesamos el tipo para meterlo en el filtro...
    var validLanguages = [languageEN, languageES];
    if (typeof lang !== 'undefined') {
        if (validLanguages.indexOf(lang) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (language)'});
        }
        labelsRef = rootRef.child(nodeLabels + '/' + lang);
    } else {
        labelsRef = rootRef.child(nodeLabels);
    }

    labelsRef.once('value')
        .then(function (snap) {
            if (typeof lang !== 'undefined') {
                var result = {};
                result[lang] = snap.val();
                return res.status(200).json({success: true, data: result});
            } else {
                return res.status(200).json({success: true, data: snap.val()});
            }
        })
        .catch(function (error) {
            return res.status(500).json({success: false, error: error});
        });
});

// --------------------------------------
// --------------------------------------
module.exports = router;