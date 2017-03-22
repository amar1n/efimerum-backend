'use strict';

module.exports = {
    firebase: {
        databaseURL: "https://efimerum-48618.firebaseio.com",
        uid: 'wolverine',
        projectId: 'efimerum-48618'
    },
    firebaseNodes: {
        _photos: '_photos',
        photos: 'photos',
        photosByLabel: 'photosByLabel',
        likes: 'likes',
        likesByPhoto: 'likesByPhoto',
        photosPostedByUser: 'photosPostedByUser',
        photosLikedByUser: 'photosLikedByUser',
        geoFireLikes: 'geofireLikes',
        geoFirePhotos: 'geofirePhotos',
        labels: 'labels',
        favoriteLabelsByUser: 'favoriteLabelsByUser',
        users: 'users',
        reports: 'reports',
        languageEN: 'EN'
    },
    firebaseDynamicLinks: {
        firebaseDynamiclinksApiUrl: 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=',
        efimerumPhotosUrl: 'https://efimerum-48618.appspot.com/api/v1/photos',
        efimerumUrl: 'https://efimerum-48618.appspot.com',
        efimerum_AndroidPackageName: 'com.efimerum.efimerum',
        efimerum_iosBundleId: 'com.charlesmoncada.Efimerum',
        efimerum_iosAppStoreId: '1009116743',
        firebaseDynamicLinkDomain: 'https://q39as.app.goo.gl/',
        firebaseWebApiKey: 'AIzaSyDZcz1tbmPrkSYDOoTOxq4_LIVCjzytSKs'
    },
    firebasePushNotifications: {
        fcmServerKey: 'AAAAo_CJqfY:APA91bHIpaGtCL7Vhs-uhU5u5clbhVqFtGw_0D0kywuWYGunbZVTTzdAJV8oA5O9_8WDIIb6oetodfITDhLwti1Ial8vE4chayOb7MjXKgHmCUMUjI4j3KLDN-UzaTdlLnp2uJQAAg5O',
        likeNotificationTitle: 'Tu foto gusta!!!',
        likeNotificationBody: 'Genial... tu foto le gusta a alguien!!!',
        likeClickAction: 'OPEN_BECAUSE_LIKE_NOTIF',
        likeNotificationCode: 'LIKE'
    },
    googleCloudStorage: {
        efimerumStorageBucket: 'efimerum-photos',
        efimerumStorageBucketPublicURL: 'https://storage.googleapis.com/efimerum-photos'
    },
    googleCloudVision: {
        defaultLabel: 'Who knows!!!',
        defaultThreshold: 75
    }
};