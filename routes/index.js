var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
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

router.get('/v1/deleteFavoriteLabel', function(req, res, next) {
    res.render('v1/deleteFavoriteLabel');
});

module.exports = router;
