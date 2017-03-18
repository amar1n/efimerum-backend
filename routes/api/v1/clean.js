'use strict';

var debug = require('debug')('efimerum:clean');
var express = require('express');
var router = express.Router();
var firebaseAuth = require('../../../lib/firebaseAuth.js');
var pp = require('./../../../lib/utils').processPhotos;

/**
 * @api {get} /clean
 * @apiGroup Clean
 * @apiDescription Process all photos to remove expired
 * @apiSuccess {String} data A successfull message
 * @apiParam {String} idToken User's ID token
 * @apiParam {String} [uid] Used by bash tasks. User's ID. Use in conjunction with 'test'
 * @apiParam {String} [test] Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/clean
 *
 *     body:
 *     {
 *       "idToken": "XXyXX"
 *     }
 *
 * @apiSuccessExample
 * HTTP/1.1 200 OK
 * {
 *   "success": true,
 *   "data": "Proceso de limieza lanzado!!!"
 * }
 * @apiErrorExample
 * HTTP/1.1 400 Bad Request
 *  {
 *    "success": false,
 *    "error": "..."
 *  }
 */
router.get('/', firebaseAuth(), function (req, res) {
    pp();
    return res.status(200).json({success: true, data: 'Proceso de limieza lanzado!!!'});
    // var interval = setInterval(pp, 60000);
});

// --------------------------------------
// --------------------------------------
module.exports = router;