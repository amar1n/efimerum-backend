var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/addPhoto', function(req, res, next) {
  res.render('addPhoto');
});

module.exports = router;
