'use strict';

var debug = require('debug')('efimerum:likesMap');
var express = require('express');
var router = express.Router();
var path = require('path');

/**
 * @api {get} /likesMap
 * @apiGroup Maps
 * @apiDescription Used to show a map with all the likes of a specified photo
 * @apiParam {String} photoUUID Photo identifier
 * @apiExample Example of use:
 * https://efimerum-48618.appspot.com/api/v1/likesMap?photoUUID=-KfEBXJmuNmDU6fdRcod
 */
router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'arcgis.html'));
});

// --------------------------------------
// --------------------------------------
module.exports = router;