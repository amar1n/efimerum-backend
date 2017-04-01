'use strict';

var debug = require('debug')('efimerum:favoriteLabels');
var express = require('express');
var router = express.Router();
var constants = require('./../../../lib/constants');
var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var firebaseAuth = require('../../../lib/firebaseAuth.js');
var logError = require('./../../../lib/utils').logError;
var validateReqDataKeys = require('./../../../lib/utils').validateReqDataKeys;

/**
 * @api {post} /favoriteLabels
 * @apiGroup Favorite labels
 * @apiDescription Post a favorite labels of a user
 * @apiParam {String} idToken User's ID token
 * @apiParam {String} lang The language of the label
 * @apiParam {String} label The label
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/favoriteLabels
 *
 *     body:
 *     {
 *       "idToken": "XXyXX",
 *       "lang": "EN",
 *       "label": "line art"
 *     }
 *
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true
 * }
 * @apiErrorExample
 * HTTP/1.1 400 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (language)"
 *  }
 */
/*
 Este endpoint toca los siguientes nodos en Firebase...
 - nodeFavoriteLabelsByUser

 Este endpoint realiza las siguientes acciones...
 0) Validamos que se reciben los parámetros acordados
 1) Validamos el idioma indicado
 2) Validamos la etiqueta indicada
 3) Persistimos en la BBDD de Firebase todos los nodos generados
 */
router.post('/', firebaseAuth(), function (req, res) {
    var validReqBody = [
        'lang',
        'label'];

    // 0) Validamos que se reciben los parámetros acordados
    var bodyKeys = Object.keys(req.body);
    var bFlag = validateReqDataKeys(validReqBody, bodyKeys);
    if (!bFlag) {
        logError('POST favoriteLabel', 'Wrong API call (query)');
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    // 1) Validamos el idioma indicado
    var lang = req.body.lang;
    var validLanguages = [constants.firebaseNodes.languageEN];
    if (typeof lang !== 'undefined' && lang.trim().length > 0) {
        if (validLanguages.indexOf(lang) === -1) {
            logError('POST favoriteLabel', 'Wrong API call (wrong language)');
            return res.status(400).json({success: false, error: 'Wrong API call (wrong language)'});
        }
    } else {
        logError('POST favoriteLabel', 'Wrong API call (language)');
        return res.status(400).json({success: false, error: 'Wrong API call (language)'});
    }

    // 2) Validamos la etiqueta indicada
    var label = req.body.label;
    var labelsRef = rootRef.child(constants.firebaseNodes.labels + '/' + lang + '/' + label);
    labelsRef.once('value')
        .then(function (snap) {
            if (snap.val() == null) {
                logError('POST favoriteLabel', 'Wrong API call (wrong label)');
                return res.status(400).json({success: false, error: 'Wrong API call (wrong label)'});
            }

            var etiqueta = snap.key;
            var uid = req.uid || 'batman';
            var updates = {};
            updates[constants.firebaseNodes.favoriteLabelsByUser + '/' + uid + '/' + lang + '/' + etiqueta] = etiqueta;

            // 3) Persistimos en la BBDD de Firebase todos los nodos generados
            rootRef.update(updates)
                .then(function () {
                    return res.status(200).json({success: true});
                })
                .catch(function (error) {
                    return res.status(500).json({success: false, error: error});
                });
        })
        .catch(function (error) {
            return res.status(400).json({success: false, error: 'Wrong API call (label)'});
        });
});

/**
 * @api {delete} /favoriteLabels
 * @apiGroup Favorite labels
 * @apiDescription Delete a favorite label of a user
 * @apiParam {String} idToken User's ID token
 * @apiParam {String} lang The language of the label
 * @apiParam {String} label The label
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/favoriteLabels?idToken=XXyXX&label=beach&lang=EN
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true
 * }
 * @apiErrorExample
 * HTTP/1.1 400 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (language)"
 *  }
 */
/*
 Este endpoint toca los siguientes nodos en Firebase...
 - nodeFavoriteLabelsByUser

 Este endpoint realiza las siguientes acciones...
 0) Validamos que se reciben los query acordados
 1) Validamos el idioma indicado
 2) Validamos la etiqueta indicada
 3) Persistimos en la BBDD de Firebase todos los nodos generados
 */
router.delete('/', firebaseAuth(), function (req, res) {
    var validReqQuery = [
        'lang',
        'label'];

    // 0) Validamos que se reciben los query acordados
    var queryKeys = Object.keys(req.query);
    var bFlag = validateReqDataKeys(validReqQuery, queryKeys);
    if (!bFlag) {
        logError('DELETE favoriteLabel', 'Wrong API call (query)');
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    // 1) Validamos el idioma indicado
    var lang = req.query.lang;
    var validLanguages = [constants.firebaseNodes.languageEN];
    if (typeof lang !== 'undefined' && lang.trim().length > 0) {
        if (validLanguages.indexOf(lang) === -1) {
            logError('DELETE favoriteLabel', 'Wrong API call (wrong language)');
            return res.status(400).json({success: false, error: 'Wrong API call (wrong language)'});
        }
    } else {
        logError('DELETE favoriteLabel', 'Wrong API call (language)');
        return res.status(400).json({success: false, error: 'Wrong API call (language)'});
    }

    var uid = req.uid || 'batman';
    var label = req.query.label;
    var updates = {};
    updates[constants.firebaseNodes.favoriteLabelsByUser + '/' + uid + '/' + lang + '/' + label] = null;

    // 2) Persistimos en la BBDD de Firebase todos los nodos generados
    rootRef.update(updates)
        .then(function () {
            return res.status(200).json({success: true});
        })
        .catch(function (error) {
            logError('DELETE favoriteLabel', 'Error: ' + error);
            return res.status(500).json({success: false, error: error});
        });
});


// --------------------------------------
// --------------------------------------
module.exports = router;