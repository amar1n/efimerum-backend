var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/alive', function(req, res, next) {
    res.render('efimerum_alive', { title: 'Express' });
});

router.get('/dead', function(req, res, next) {
    res.render('efimerum_dead', { title: 'Express' });
});

router.get('/v1/addPhoto', function(req, res, next) {
    res.render('v1/addPhoto');
});

router.get('/v1/addLike', function(req, res, next) {
    res.render('v1/addLike');
});

router.get('/v1/addFavoriteLabel', function(req, res, next) {
    res.render('v1/addFavoriteLabel');
});

router.get('/v1/getLabels', function(req, res, next) {
    res.render('v1/getLabels');
});

router.get('/v1/clean', function(req, res, next) {
    res.render('v1/clean');
});

router.get('/v1/pushNotification', function(req, res, next) {
    res.render('v1/pushNotification');
});

router.get('/v1/geofire', function(req, res, next) {
    res.render('v1/geofire');
});

router.get('/v1/reportPhoto', function(req, res, next) {
    res.render('v1/reportPhoto');
});

router.get('/v1/dynamicLinks', function(req, res, next) {
    res.render('v1/dynamicLinks');
});

module.exports = router;
