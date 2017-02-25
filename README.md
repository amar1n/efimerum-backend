#Guía de creación del backend

Nota: https://crisp.im/blog/why-you-should-never-use-firebase-realtime-database/

##Server NodeJS-Express
1) Para crear el server de NdeJS con Express

`express amgnodeexpress --ejs`

2) Para instalar todas las dependencias necesarias, ejecutarlo dentro del folder del proyecto recién creado

`npm install`

3) Para instalar [Multer](https://github.com/expressjs/multer) y así poder subir files al servidor

`npm install --save multer`

4) Crear los folders...
* lib
* routes/api/v1
* public/uploads

5) Eliminar...
* public/images
* public/javascripts
* public/stylesheets
* routes/users.js (y sus referencias en app.js)

##Database en Firebase
1) Crear un proyecto en [Firebase](https://console.firebase.google.com/)

2) En la FirebaseConsola del proyecto recién creado, se deben activar los proveedores de autenticación necesarios. Puede que sea necesario la creación de usuarios en la FirebaseConsola del proyecto recién creado.

3) En la FirebaseConsola del proyecto recién creado, se deben retocar las reglas de la BBDD de la sigiente manera...
{
  "rules": {
    ".read": true,
    "_photos": {
      "$photo_id": {
        ".write": "auth.uid === 'wolverine'",
        ".validate": "!data.exists() || (newData.child('numOfLikes').val() === root.child('photos').child($photo_id).child('numOfLikes').val())"
      }
    },
    "geofireLikes": {
      ".write": "auth.uid === 'wolverine'"
    },
    "geofirePhotos": {
      ".write": "auth.uid === 'wolverine'"
    },
    "labels": {
      ".write": "auth.uid === 'wolverine'"
    },
    "likes": {
      ".write": "auth.uid === 'wolverine'"
    },
    "likesByPhoto": {
      ".write": "auth.uid === 'wolverine'"
    },
    "photos": {
      ".write": "auth.uid === 'wolverine'"
    },
    "photosByLabel": {
      "$language": {
        "$label": {
          "$photo_id": {
				    ".write": "auth.uid === 'wolverine'",
            ".validate": "!data.exists() || (newData.child('numOfLikes').val() === root.child('photos').child($photo_id).child('numOfLikes').val())"
          }
        }
      }
    },
    "photosLikedByUser": {
      "$photo_id": {
        ".write": "auth.uid === 'wolverine'",
        ".validate": "!data.exists() || (newData.child('numOfLikes').val() === root.child('photos').child($photo_id).child('numOfLikes').val())"
      }
    },
    "photosPostedByUser": {
      "$user_id": {
        "$photo_id": {
          ".write": "auth.uid === 'wolverine'",
          ".validate": "!data.exists() || (newData.child('numOfLikes').val() === root.child('photos').child($photo_id).child('numOfLikes').val())"
        }
      }
    },
    "users": {
      ".write": "auth.uid != null"
    }
  }
}

4) Crear una Service account key en la [GoogleCloudConsole](https://console.cloud.google.com), en API Manager / Credentials. Luego copiar el json en el proyecto y referenciarlo en la inicialización de Firebase.

5) Indicar el JSON y el Id del proyecto Firebase en la inicialización de Firebase

6) Para instalar Firebase y poder acceder a la BBDD

`npm install --save firebase`

##Storage en Google Cloud Platform

Un ejemplo de acceso sería... https://storage.googleapis.com/efimero-fotos/IMG_0081.jpg

0) links
* https://www.youtube.com/watch?v=n4svrNcAkJg
* https://cloud.google.com/storage/docs/quickstarts
* https://www.npmjs.com/package/@google-cloud/storage

1) Run `npm install --save @google-cloud/storage`

2) Install the latest Cloud Tools version

3) Download and extract the file google-cloud-sdk-141.0.0-darwin-x86_64.tar.gz

4) Run `./google-cloud-sdk/install.sh`

5) Run `./google-cloud-sdk/bin/gcloud init` (para configurar el Google Cloud SDK y poder empezar a usarlo)

6) Authenticate in the opened browser

7) Select a project in the console

8) Run `gcloud beta auth application-default login`

9) Copiar el json generado al proyecto

10) Crear un segmento en el Storage

11) Para que los usuarios puedan ver las imagenes subidas: `gsutil defacl set public-read gs://[YOUR_BUCKET_NAME]`

##Google Cloud Vision

0) links
* https://medium.com/google-cloud/using-the-google-cloud-vision-api-with-node-js-194e507afbd8#.ibip4313o

1) Run `npm install --save google-cloud`

2) Habilitar Google Cloud Vision API en la consola de administración de APIs del proyecto en GoogleCloudPlatform