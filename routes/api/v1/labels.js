'use strict';

var debug = require('debug')('efimerum:labels');
var express = require('express');
var router = express.Router();
var constants = require('./../../../lib/constants');
var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var firebaseAuth = require('../../../lib/firebaseAuth.js');
var logError = require('./../../../lib/utils').logError;
var validateReqDataKeys = require('./../../../lib/utils').validateReqDataKeys;

/**
 * @api {post} /labels
 * @apiGroup Labels
 * @apiDescription Retrieve the list of labels
 * @apiParam {String} idToken User's ID token
 * @apiParam {String} [lang] The language required
 * @apiParam {Boolean} myFavorites A flag indicating that the returned labels will be the favorites of the user performing the query
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/labels
 *
 *     body:
 *     {
 *       "idToken": "XXyXX",
 *       "lang": "EN"
 *     }
 *
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
 1) Construimos el nodo a consultar en función de los parametros recibidos
 1.a) Validamos si se reqieren las favoritas del usuario
 1.b) Validamos el idioma solicitado
 2) Leemos las etiquetas de la BBDD de Firebase
 */
router.post('/', firebaseAuth(), function (req, res) {
    var validReqBody = [
        'myFavorites'];

    // 0) Validamos que se reciben los parámetros acordados
    var bodyKeys = Object.keys(req.body);
    var bFlag = validateReqDataKeys(validReqBody, bodyKeys);
    if (!bFlag) {
        logError('GET labels', 'Wrong API call (query)');
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    // 1) Construimos el nodo a consultar en función de los parametros recibidos
    var labelsRefAUX = '';

    // 1.a) Validamos si se reqieren las favoritas del usuario
    var myFavorites = req.body.myFavorites;
    if (myFavorites === 'true') {
        var uid = req.uid || 'batman';
        labelsRefAUX = constants.firebaseNodes.favoriteLabelsByUser + '/' + uid;
    } else {
        labelsRefAUX = constants.firebaseNodes.labels;
    }

    // 1.b) Validamos el idioma solicitado
    var lang = req.query.lang;
    var validLanguages = [constants.firebaseNodes.languageEN];
    if (typeof lang !== 'undefined' && lang.trim().length > 0) {
        if (validLanguages.indexOf(lang) === -1) {
            return res.status(400).json({success: false, error: 'Wrong API call (language)'});
        }
        labelsRefAUX = labelsRefAUX + '/' + lang;
    }

    var labelsRef = rootRef.child(labelsRefAUX);

    // 2) Leemos las etiquetas de la BBDD de Firebase
    labelsRef.once('value')
        .then(function (snap) {
            if (typeof lang !== 'undefined' && lang.trim().length > 0) {
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