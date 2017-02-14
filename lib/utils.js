'use strict';

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
    dest: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
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
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // no larger than 5mb
    }
});

module.exports.processErrorInPostPhoto = function (error, traceMsg, fotosBucket,
                                                   photoPath, photoFilename, fsDeletePhoto, bucketDeletePhoto,
                                                   thumbnailPath, thumbnailFilename, fsDeleteThumbnail, bucketDeleteThumbnail) {
    console.log(traceMsg, error);
    if (fsDeletePhoto) {
        fs.unlinkSync(photoPath);
    }
    if (fsDeleteThumbnail) {
        fs.unlinkSync(thumbnailPath);
    }
    if (bucketDeletePhoto) {
        fotosBucket.file(photoFilename).delete(function (err) {
            if (err) {
                console.log('Error deleting the image in Google Cloud Storage', photoFilename, err);
            }
        });
    }
    if (bucketDeleteThumbnail) {
        fotosBucket.file(thumbnailFilename).delete(function (err) {
            if (err) {
                console.log('Error deleting the thumbnail in Google Cloud Storage', thumbnailFilename, err);
            }
        });
    }
};