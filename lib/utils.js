'use strict';

module.exports.shuffleFirebaseJSON = function (snap) {
    // De Firebase JSON a un Array con las claves
    var arr = [];
    snap.forEach(function(ss) {
        arr.push( ss.key );
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
    arr.forEach(function(value){
        var val = snap.child(value).val();
        val['index'] = index;
        result[value] = val;
        index++;
    });
    return result;
};

var multer = require('multer');
module.exports.multer = multer({
    dest: 'public/uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // no larger than 5mb
    }
});
