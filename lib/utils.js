'use strict';

var firebase = require('./googleCloudPlatform.js').firebase;
var rootRef = firebase.database().ref();
var storage = require('./googleCloudPlatform.js').storage;
var moment = require('moment');
var fs = require('fs');
var logger = require('./googleCloudPlatform.js').logger;

const node_Photos = '_photos';
const nodePhotos = 'photos';
const nodePhotosByLabel = 'photosByLabel';
const nodeLikes = 'likes';
const nodeLikesByPhoto = 'likesByPhoto';
const nodePhotosPostedByUser = 'photosPostedByUser';
const nodePhotosLikedByUser = 'photosLikedByUser';
const nodeGeoFireLikes = 'geofireLikes';
const nodeGeoFirePhotos = 'geofirePhotos';
const languageEN = 'EN';
const efimerumStorageBucket = 'efimerum-photos';

module.exports.shuffleFirebaseJSON = function (snap) {
    // De Firebase JSON a un Array con las claves
    var arr = [];
    snap.forEach(function (ss) {
        arr.push(ss.key);
    });

    // Mezclamos el Array de claves
    var i, j, temp;
    for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    // Del Array de claves a un JSON
    var result = {};
    var index = 0;
    arr.forEach(function (value) {
        var val = snap.child(value).val();
        val['index'] = index;
        result[value] = val;
        index++;
    });
    return result;
};

var multer = require('multer');
var multerStorage = multer.diskStorage({
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
    }
});

module.exports.multer = multer({
    storage: multerStorage,
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpeg|png)$/)) {
            return cb(new Error('Only image files are allowed!'));
        }
        cb(null, true);
    }
});

module.exports.processErrorInPostPhoto = function (error, traceMsg, fotosBucket,
                                                   photoPath, photoFilename, fsDeletePhoto, bucketDeletePhoto,
                                                   thumbnailPath, thumbnailFilename, fsDeleteThumbnail, bucketDeleteThumbnail) {
    logError('POST photos', traceMsg + ': ' + error);

    if (fsDeletePhoto) {
        fs.unlinkSync(photoPath);
    }
    if (fsDeleteThumbnail) {
        fs.unlinkSync(thumbnailPath);
    }
    if (bucketDeletePhoto) {
        fotosBucket.file(photoFilename).delete(function (err) {
            if (err) {
                logError('POST photos', 'Error deleting the image in Google Cloud Storage [' + photoFilename + ']: ' + err);
            }
        });
    }
    if (bucketDeleteThumbnail) {
        fotosBucket.file(thumbnailFilename).delete(function (err) {
            if (err) {
                logError('POST photos', 'Error deleting the thumbnail in Google Cloud Storage [' + thumbnailFilename + ']: ' + err);
            }
        });
    }
};

/*
 addPhoto toca los siguientes nodos...
 - _photos
 - geofirePhotos
 - photos
 - photosByLabel
 - photosPostedByUser

 addLike toca los siguientes nodos...
 - _photos
 - geofireLikes
 - likes
 - likesByPhoto
 - photos
 - photosByLabel
 - photosLikedByUser
 - photosPostedByUser

 Este endpoint toca los siguientes nodos en Firebase...
 - _photos
 - geofireLikes
 - geofirePhotos
 - likes
 - likesByPhoto
 - photos
 - photosByLabel
 - photosLikedByUser
 - photosPostedByUser

 Este endpoint realiza las siguientes acciones...
 1) Obtenemos las fotos de Firebase ordenadas por expirationDate
 2) Generamos un Array para darle la vuelta a la ordenación de Firebase y así empezar por las fotos con menos vida
 3) Procesamos el Array para borrar las fotos anteriores a este momento
 4) Borramos en la BBDD de Firebase la foto del nodo principal usando una transacción
 5) Generamos los paths que contienen referencia a la foto
 6) Borramos en la BBDD de Firebase los paths donde está la foto usando un update múltiple
 7.a) Borramos la imagen del storage
 7.b) Borramos el thumbnail del storage
 */
module.exports.processPhotos = function () {
    logInfo('processPhotos', 'Empieza processPhotos..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));
    // 1) Obtenemos las fotos de Firebase ordenadas por expirationDate
    rootRef.child(node_Photos).orderByChild('expirationDate').once('value')
        .then(function (snap) {

            // 2) Generamos un Array para darle la vuelta a la ordenación de Firebase y así empezar por las fotos con menos vida
            var now = moment().unix();
            var arr = [];
            snap.forEach(function (ss) {
                arr.push(ss.key);
            });
            arr.reverse();

            logInfo('processPhotos', 'Se procesarán...' + arr.length + '..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));

            // 3) Procesamos el Array para borrar las fotos anteriores a este momento
            arr.forEach(function (item) {
                const fotoKey = snap.child(item).key;
                const foto = snap.child(item).val();
                if (now < foto.expirationDate) { // TODO: cambiar el signo para que se borren las antiguas... por ahora lo dejo así por testing!!!
                    logInfo('processPhotos', 'Procesando... ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));

                    // 4) Borramos en la BBDD de Firebase la foto del nodo principal usando una transacción
                    var photoRef = rootRef.child(nodePhotos + '/' + fotoKey);
                    photoRef.transaction(function (currentData) {
                        return null;
                    }, function (error, committed, snapshot) {
                        if (error) {
                            logError('processPhotos', 'Transaction failed abnormally!... ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a') + ': ' + error);
                        } else if (!committed) {
                            logError('processPhotos', 'Transaction aborted!... ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));
                        } else {
                            logInfo('processPhotos', 'Borrado 1 OK en Firebase... ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));

                            // 5) Generamos los paths que contienen referencia a la foto
                            var updates = {};
                            updates[node_Photos + '/' + fotoKey] = null;
                            updates[nodeGeoFirePhotos + '/' + fotoKey] = null;
                            if (foto.labels !== undefined) {
                                Object.keys(foto.labels[languageEN]).forEach(function (label) {
                                    updates[nodePhotosByLabel + '/' + languageEN + '/' + label + '/' + fotoKey] = null;
                                });
                            }
                            updates[nodePhotosPostedByUser + '/' + foto.owner + '/' + fotoKey] = null;
                            if (foto.likes !== undefined) {
                                Object.keys(foto.likes).forEach(function (like) {
                                    updates[nodeGeoFireLikes + '/' + like] = null;
                                    updates[nodeLikes + '/' + like] = null;
                                    updates[nodePhotosLikedByUser + '/' + foto.likes[like].userId + '/' + fotoKey] = null;
                                });
                            }
                            updates[nodeLikesByPhoto + '/' + fotoKey] = null;

                            // 6) Borramos en la BBDD de Firebase los paths donde está la foto usando un update múltiple
                            rootRef.update(updates)
                                .then(function () {
                                    logInfo('processPhotos', 'Borrado OK en Firebase... ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));

                                    // 7.a) Borramos la imagen del storage
                                    if (typeof foto.imageData.fileName !== 'undefined') {
                                        const fotosBucket = storage.bucket(efimerumStorageBucket);
                                        fotosBucket.file(foto.imageData.fileName).delete()
                                            .then(function (data) {
                                                logInfo('processPhotos', 'Borrado OK de image en storage, ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));
                                            })
                                            .catch(function (error) {
                                                logError('processPhotos', 'Error borrando image en storage, ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a') + ': ' + error);
                                            });
                                    } else {
                                        logError('processPhotos', 'No puedo borrar image del storage por falta de fileName, ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));
                                    }

                                    // 7.b) Borramos el thumbnail del storage
                                    if (typeof foto.thumbnailData.fileName !== 'undefined') {
                                        const fotosBucket = storage.bucket(efimerumStorageBucket);
                                        fotosBucket.file(foto.thumbnailData.fileName).delete()
                                            .then(function (data) {
                                                logInfo('processPhotos', 'Borrado OK de thumbnail en storage, ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));
                                            })
                                            .catch(function (error) {
                                                logError('processPhotos', 'Error borrando thumbnail en storage, ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a') + ': ' + error);
                                            });
                                    } else {
                                        logError('processPhotos', 'No puedo borrar thumbnail del storage por falta de fileName, ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));
                                    }
                                })
                                .catch(function (error) {
                                    logError('processPhotos', 'Error borrado en Firebase, ' + fotoKey + ' ..............................' + moment().format('MMMM Do YYYY, h:mm:ss a') + ': ' + error);
                                });
                        }
                    });
                } else {
                    logInfo('processPhotos', 'Sigue viva... ' + fotoKey + ', expirationDate: ' + moment.unix(foto.expirationDate).format('MMMM Do YYYY, h:mm:ss a') + '..............................' + moment().format('MMMM Do YYYY, h:mm:ss a'));
                }
            });
        })
        .catch(function (error) {
            logError('processPhotos', 'Error leyendo las fotos en Firebase..............................' + moment().format('MMMM Do YYYY, h:mm:ss a') + ': ' + error);
        });
};

var logError = function (category, message) {
    console.log(category, ' ::: ', message);
    logger.error(category + ' ::: ' + message);
};
module.exports.logError = logError;

var logInfo = function (category, message) {
    console.log(category, ' ::: ', message);
    logger.info(category + ' ::: ' + message);
};
module.exports.logInfo = logInfo;
