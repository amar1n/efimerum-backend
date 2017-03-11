var express = require('express');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');

var routes = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/api/v1/photos', require('./routes/api/v1/photos'));
app.use('/api/v1/labels', require('./routes/api/v1/labels'));
app.use('/api/v1/likes', require('./routes/api/v1/likes'));
app.use('/api/v1/clean', require('./routes/api/v1/clean'));
app.use('/api/v1/geofire', require('./routes/api/v1/geofire'));
app.use('/api/v1/favoriteLabel', require('./routes/api/v1/favoriteLabel'));
app.use('/api/v1/pushNotification', require('./routes/api/v1/pushNotification'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.json({
            message: err.message,
            error: err,
            status: err.status
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: {},
        status: err.status
    });
});


module.exports = app;
