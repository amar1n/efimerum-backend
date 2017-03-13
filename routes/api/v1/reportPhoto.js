'use strict';

var debug = require('debug')('efimerum:reportPhoto');
var express = require('express');
var router = express.Router();

var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var moment = require('moment');
var firebaseAuth = require('../../../lib/firebaseAuth.js');
var logError = require('./../../../lib/utils').logError;
var validateReqDataKeys = require('./../../../lib/utils').validateReqDataKeys;

const node_Photos = '_photos';
const nodeReports = 'reports';

/**
 * @api {post} /reportPhoto
 * @apiGroup Report photo
 * @apiDescription Report a photo
 * @apiSuccess {String} data The report key
 * @apiParam {String} idToken User's ID token
 * @apiParam {String} photoKey Photo identifier
 * @apiParam {String} reportCode Report cause. Must be one of this options: 'adult', 'spoof', 'medical', 'violence', 'other'
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/reportPhoto
 *
 *     body:
 *     {
 *       "idToken": "XXyXX",
 *       "photoKey": "-KcwxqctGBzxhzI5zJfH",
 *       "reportCode": "adult"
 *     }
 *
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "data": "-345345KcisySBwVA_AevvTJGD"
 * }
 * @apiErrorExample
 * HTTP/1.1 404 Bad Request
 *  {
 *    "success": false,
 *    "error": "Wrong API call (query)"
 *  }
 */
/*
 Este endpoint toca los siguientes nodos en Firebase...
 - _photos: Actualiza la foto de uso interno del backend añadiendo el like y modificando expirationDate y numOfLikes
 - reports: Crea la denuncia

 Este endpoint realiza las siguientes acciones...
 0) Validamos que se reciben los parámetros acordados
 1) Validamos el código de la denuncia
 2) Obtenemos la referencia a la foto de uso exclusivo del Backend
 3) Validamos que un mismo usuario no emite más de una denuncia para la misma foto
 4) Generamos los nodos para la denuncia en la BBDD de Firebase
 5) Persistimos en la BBDD de Firebase los nodos generados
 */
router.post('/', firebaseAuth(), function (req, res) {
    var validReqBody = [
        'photoKey',
        'reportCode'];

    // 0) Validamos que se reciben los parámetros acordados
    var bodyKeys = Object.keys(req.body);
    var bFlag = validateReqDataKeys(validReqBody, bodyKeys);
    if (!bFlag) {
        logError('POST reportPhoto', 'Wrong API call (query)');
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    // 1) Validamos el código de la denuncia
    var reportCode = req.body.reportCode;
    var validReportCodes = [
        'adult',
        'spoof',
        'medical',
        'violence',
        'other'];
    bFlag = validReportCodes.indexOf(reportCode) > -1;
    if (!bFlag) {
        logError('POST reportPhoto', 'Wrong API call (report code)');
        return res.status(400).json({success: false, error: 'Wrong API call (report code)'});
    }

    // 2) Obtenemos la referencia a la foto de uso exclusivo del Backend
    var photoKey = req.body.photoKey;
    var _photoRef = rootRef.child(node_Photos + '/' + photoKey);
    _photoRef.once('value')
        .then(function (snap) {
            var _photo = snap.val();

            if (_photo === null) {
                logError('POST reportPhoto', '.............Read once in _photos with photoKey: ' + photoKey + ' ....Error: Photo does not exists!!!');
                return res.status(500).json({success: false, error: 'Photo [' + photoKey + '] does not exists!!!'});
            }

            // 3) Validamos que un mismo usuario no emite más de una denuncia para la misma foto
            var uid = req.uid || 'batman';
            var bFlag = false;
            if (_photo.reports !== undefined) {
                var reports = Object.keys(_photo.reports);
                for (var i = 0; i < reports.length; i++) {
                    if (_photo.reports[reports[i]].userId === uid) {
                        bFlag = true;
                        break;
                    }
                }
            }
            if (bFlag) {
                logError('POST reportPhoto', 'Not more than one report per user for each photo');
                return res.status(400).json({
                    success: false,
                    error: 'Not more than one report per user for each photo'
                });
            }

            // 4) Generamos los nodos para la denuncia en la BBDD de Firebase
            var updates = {};
            var reportKey = rootRef.child(nodeReports).push().key;
            var now = moment();
            var reportData = {
                creationDate: now.unix(),
                userId: uid,
                photoKey: photoKey,
                reportCode: reportCode
            };
            updates[nodeReports + '/' + reportKey] = reportData;
            updates[node_Photos + '/' + photoKey + '/' + 'reports' + '/' + reportKey] = reportData;


            // 5) Persistimos en la BBDD de Firebase los nodos generados
            rootRef.update(updates)
                .then(function () {
                    return res.status(200).json({success: true, data: reportKey});
                })
                .catch(function (error) {
                    logError('POST reportPhoto', 'Error updating the database: ' + error);
                    return res.status(500).json({success: false, error: error});
                });
        })
        .catch(function (error) {
            logError('POST reportPhoto', '.............Read once in _photos with photoKey: ' + photoKey + ' ....Error: ' + error);
            return res.status(500).json({
                success: false,
                error: error
            });
        });

});

// --------------------------------------
// --------------------------------------
module.exports = router;