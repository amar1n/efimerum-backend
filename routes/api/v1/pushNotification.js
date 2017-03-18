'use strict';

var debug = require('debug')('efimerum:pushNotification');
var express = require('express');
var router = express.Router();
var constants = require('./../../../lib/constants');
var firebase = require('./../../../lib/googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var firebaseAuth = require('../../../lib/firebaseAuth.js');
var pushNotification = require('./../../../lib/googleCloudPlatform').pushNotification;
var validateReqDataKeys = require('./../../../lib/utils').validateReqDataKeys;

/**
 * @api {post} /pushNotification
 * @apiGroup Push Notification
 * @apiDescription Push a notification
 * @apiSuccess {String} data A successfull message
 * @apiParam {String} idToken User's ID token
 * @apiParam {String} notificationCode Notification identifier ('LIKE')
 * @apiParam {String} photoKey Photo identifier
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/pushNotification
 *
 *     body:
 *     {
 *       "idToken": "XXyXX",
 *       "notificationCode": "LIKE",
 *       "photoKey": "-Kenul0i80ubW2_CflS7",
 *     }
 *
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "data": "Notificación enviada!!!"
 * }
 * @apiErrorExample
 * HTTP/1.1 400 Bad Request
 *  {
 *    "success": false,
 *    "error": "..."
 *  }
 */
router.post('/', firebaseAuth(), function (req, res) {
    var validReqBody = [
        'notificationCode',
        'photoKey'];

    // 0) Validamos que se reciben los parámetros acordados
    var bodyKeys = Object.keys(req.body);
    var bFlag = validateReqDataKeys(validReqBody, bodyKeys);
    if (!bFlag) {
        logError('POST pushNotification', 'Wrong API call (query)');
        return res.status(400).json({success: false, error: 'Wrong API call (query)'});
    }

    var notificationCode = req.body.notificationCode;
    var photoKey = req.body.photoKey;

    var _photoRef = rootRef.child(constants.firebaseNodes._photos + '/' + photoKey);
    _photoRef.once('value')
        .then(function (snap) {
            var _photo = snap.val();

            var userRef = rootRef.child(constants.firebaseNodes.users + '/' + _photo.owner);
            userRef.once('value')
                .then(function (snap) {
                    var user = snap.val();

                    var fcmToken = user.fcmToken;
                    if (fcmToken === undefined) {
                        return res.status(500).json({
                            success: false,
                            error: 'User (' + user.email + ') without FCM Token'
                        });
                    }

                    pushNotification(notificationCode, photoKey, fcmToken)
                        .then(function (response) {
                            console.log("Successfully sent with response: ", response);
                            return res.status(200).json({success: true, data: 'Notificación enviada!!!'});
                        })
                        .catch(function (err) {
                            console.log("Something has gone wrong!");
                            console.error(err);
                            return res.status(500).json({success: false, error: err});
                        });
                })
                .catch(function (error) {
                    logError('POST likes', '.............Read once in users with uuid: ' + _photo.owner + ' ....Error: ' + error);
                    return res.status(500).json({
                        success: false,
                        error: error
                    });
                });
        })
        .catch(function (error) {
            logError('POST likes', '.............Read once in _photos with photoKey: ' + photoKey + ' ....Error: ' + error);
            return res.status(500).json({
                success: false,
                error: error
            });
        });
});

// --------------------------------------
// --------------------------------------
module.exports = router;