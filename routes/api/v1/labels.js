'use strict';

var debug = require('debug')('efimerum:labels');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var firebaseAuth = require('../../../lib/firebaseAuth.js');

const nodeLabels = 'labels';
const languageEN = 'EN';

/**
 * @api {get} /labels
 * @apiGroup Labels
 * @apiDescription Retrieve the list of labels
 * @apiParam {String} [lang] The language required
 * @apiParam [String] uid Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam [String] test Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
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
/*
 0) Validamos que sólo se reciben los query acordados
 1) Validamos el idioma solicitado
 2) Leemos las etiquetas de la BBDD de Firebase
 */
router.get('/', firebaseAuth(), function (req, res) {
    var validReqQuery = [
        'lang'];

    // 0) Validamos que sólo se reciben los query acordados
    var queryKeys = Object.keys(req.query);
    for (var j = 0; j < queryKeys.length; j++) {
        if (validReqQuery.indexOf(queryKeys[j]) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (query)'});
        }
    }

    // 1) Validamos el idioma solicitado
    var lang = req.query.lang;
    var labelsRef = '';
    var validLanguages = [languageEN];
    if (typeof lang !== 'undefined') {
        if (validLanguages.indexOf(lang) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (language)'});
        }
        labelsRef = rootRef.child(nodeLabels + '/' + lang);
    } else {
        labelsRef = rootRef.child(nodeLabels);
    }

    // 2) Leemos las etiquetas de la BBDD de Firebase
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