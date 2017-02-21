'use strict';

var debug = require('debug')('efimerum:clean');
var express = require('express');
var router = express.Router();

var pp = require('./../../../lib/utils').processPhotos;

/**
 * @api {get} /clean
 * @apiGroup Clean
 * @apiDescription Process all photos to remove expired
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/clean
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
router.get('/', function (req, res) {
    pp();
    return res.status(200).json({success: true, data: 'Proceso de limieza lanzado!!!'});
    // var interval = setInterval(pp, 60000);
});

// --------------------------------------
// --------------------------------------
module.exports = router;