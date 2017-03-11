define({ "api": [  {    "type": "get",    "url": "/clean",    "title": "",    "group": "Clean",    "description": "<p>Process all photos to remove expired</p>",    "success": {      "fields": {        "Success 200": [          {            "group": "Success 200",            "type": "String",            "optional": false,            "field": "data",            "description": "<p>A successfull message</p>"          }        ]      },      "examples": [        {          "title": "HTTP/1.1 200 OK",          "content": "HTTP/1.1 200 OK\n{\n  \"success\": true,\n  \"data\": \"Proceso de limieza lanzado!!!\"\n}",          "type": "json"        }      ]    },    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "idToken",            "description": "<p>User's ID token</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "uid",            "description": "<p>Used by bash tasks. User's ID. Use in conjunction with 'test'</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "test",            "description": "<p>Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'</p>"          }        ]      }    },    "examples": [      {        "title": "Example of use:",        "content": "https://efimerum-48618.appspot.com/api/v1/clean\n\n    body:\n    {\n      \"idToken\": \"XXyXX\"\n    }",        "type": "json"      }    ],    "error": {      "examples": [        {          "title": "HTTP/1.1 400 Bad Request",          "content": "HTTP/1.1 400 Bad Request\n {\n   \"success\": false,\n   \"error\": \"...\"\n }",          "type": "json"        }      ]    },    "version": "0.0.0",    "filename": "./routes/api/v1/clean.js",    "groupTitle": "Clean",    "name": "GetClean"  },  {    "type": "delete",    "url": "/favoriteLabels",    "title": "",    "group": "Favorite_labels",    "description": "<p>Delete a favorite label of a user</p>",    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "idToken",            "description": "<p>User's ID token</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "lang",            "description": "<p>The language of the label</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "label",            "description": "<p>The label</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "uid",            "description": "<p>Used by bash tasks. User's ID. Use in conjunction with 'test'</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "test",            "description": "<p>Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'</p>"          }        ]      }    },    "examples": [      {        "title": "Example of use:",        "content": "https://efimerum-48618.appspot.com/api/v1/favoriteLabels?idToken=XXyXX&label=beach&lang=EN",        "type": "json"      }    ],    "success": {      "examples": [        {          "title": "HTTP/1.1 200 OK",          "content": "HTTP/1.1 200 OK\n{\n  \"success\": true\n}",          "type": "json"        }      ]    },    "error": {      "examples": [        {          "title": "HTTP/1.1 400 Bad Request",          "content": "HTTP/1.1 400 Bad Request\n {\n   \"success\": false,\n   \"error\": \"Wrong API call (language)\"\n }",          "type": "json"        }      ]    },    "version": "0.0.0",    "filename": "./routes/api/v1/favoriteLabel.js",    "groupTitle": "Favorite_labels",    "name": "DeleteFavoritelabels"  },  {    "type": "post",    "url": "/favoriteLabels",    "title": "",    "group": "Favorite_labels",    "description": "<p>Post a favorite labels of a user</p>",    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "idToken",            "description": "<p>User's ID token</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "lang",            "description": "<p>The language of the label</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "label",            "description": "<p>The label</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "uid",            "description": "<p>Used by bash tasks. User's ID. Use in conjunction with 'test'</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "test",            "description": "<p>Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'</p>"          }        ]      }    },    "examples": [      {        "title": "Example of use:",        "content": "https://efimerum-48618.appspot.com/api/v1/favoriteLabels\n\n    body:\n    {\n      \"idToken\": \"XXyXX\",\n      \"lang\": \"EN\",\n      \"label\": \"line art\"\n    }",        "type": "json"      }    ],    "success": {      "examples": [        {          "title": "HTTP/1.1 200 OK",          "content": "HTTP/1.1 200 OK\n{\n  \"success\": true\n}",          "type": "json"        }      ]    },    "error": {      "examples": [        {          "title": "HTTP/1.1 400 Bad Request",          "content": "HTTP/1.1 400 Bad Request\n {\n   \"success\": false,\n   \"error\": \"Wrong API call (language)\"\n }",          "type": "json"        }      ]    },    "version": "0.0.0",    "filename": "./routes/api/v1/favoriteLabel.js",    "groupTitle": "Favorite_labels",    "name": "PostFavoritelabels"  },  {    "type": "get",    "url": "/labels",    "title": "",    "group": "Labels",    "description": "<p>Retrieve the list of labels</p>",    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "idToken",            "description": "<p>User's ID token</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "lang",            "description": "<p>The language required</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "uid",            "description": "<p>Used by bash tasks. User's ID. Use in conjunction with 'test'</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "test",            "description": "<p>Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'</p>"          }        ]      }    },    "examples": [      {        "title": "Example of use:",        "content": "https://efimerum-48618.appspot.com/api/v1/labels\n\n    body:\n    {\n      \"idToken\": \"XXyXX\",\n      \"lang\": \"EN\"\n    }",        "type": "json"      }    ],    "success": {      "examples": [        {          "title": "HTTP/1.1 200 OK",          "content": "HTTP/1.1 200 OK\n{\n  \"success\": true,\n  \"data\": {\n      \"EN\": {\n         \"cartoon\": true,\n         \"comic book\": true,\n         \"comics\": true,\n         \"geological phenomenon\": true,\n         \"lake\": true,\n         \"mountain\": true,\n         \"snow\": true,\n         \"weather\": true,\n         \"winter\": true\n      }\n  }\n}",          "type": "json"        }      ]    },    "error": {      "examples": [        {          "title": "HTTP/1.1 400 Bad Request",          "content": "HTTP/1.1 400 Bad Request\n {\n   \"success\": false,\n   \"error\": \"Wrong API call (language)\"\n }",          "type": "json"        }      ]    },    "version": "0.0.0",    "filename": "./routes/api/v1/labels.js",    "groupTitle": "Labels",    "name": "GetLabels"  },  {    "type": "post",    "url": "/likes",    "title": "",    "group": "Likes",    "description": "<p>Post a like in a single photo</p>",    "success": {      "fields": {        "Success 200": [          {            "group": "Success 200",            "type": "String",            "optional": false,            "field": "data",            "description": "<p>The like key</p>"          }        ]      },      "examples": [        {          "title": "HTTP/1.1 200 OK",          "content": "HTTP/1.1 200 OK\n{\n  \"success\": true,\n  \"data\": \"-345345KcisySBwVA_AevvTJGD\"\n}",          "type": "json"        }      ]    },    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "idToken",            "description": "<p>User's ID token</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "photoKey",            "description": "<p>Photo identifier</p>"          },          {            "group": "Parameter",            "type": "Number",            "optional": true,            "field": "latitude",            "description": "<p>The latitude of the user performing the action</p>"          },          {            "group": "Parameter",            "type": "Number",            "optional": true,            "field": "longitude",            "description": "<p>The longitude of the user performing the action</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "uid",            "description": "<p>Used by bash tasks. User's ID. Use in conjunction with 'test'</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "test",            "description": "<p>Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'</p>"          }        ]      }    },    "examples": [      {        "title": "Example of use:",        "content": "https://efimerum-48618.appspot.com/api/v1/likes\n\n    body:\n    {\n      \"idToken\": \"XXyXX\",\n      \"photoKey\": \"-KcwxqctGBzxhzI5zJfH\",\n      \"latitude\": 41.375395,\n      \"longitude\": 2.170624\n    }",        "type": "json"      }    ],    "error": {      "examples": [        {          "title": "HTTP/1.1 404 Bad Request",          "content": "HTTP/1.1 404 Bad Request\n {\n   \"success\": false,\n   \"error\": \"Wrong API call (query)\"\n }",          "type": "json"        }      ]    },    "version": "0.0.0",    "filename": "./routes/api/v1/likes.js",    "groupTitle": "Likes",    "name": "PostLikes"  },  {    "type": "post",    "url": "/photos",    "title": "",    "group": "Photos",    "description": "<p>Post a single photo using a form multipart (multipart/form-data). Only jpeg and png are accepted.</p>",    "success": {      "fields": {        "Success 200": [          {            "group": "Success 200",            "type": "String",            "optional": false,            "field": "data",            "description": "<p>The photo key</p>"          }        ]      },      "examples": [        {          "title": "HTTP/1.1 200 OK",          "content": "HTTP/1.1 200 OK\n{\n  \"success\": true,\n  \"data\": \"-KcisySBwVA_AevvTJGD\"\n}",          "type": "json"        }      ]    },    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "idToken",            "description": "<p>User's ID token</p>"          },          {            "group": "Parameter",            "type": "Number",            "optional": true,            "field": "latitude",            "description": "<p>The latitude of the user performing the action</p>"          },          {            "group": "Parameter",            "type": "Number",            "optional": true,            "field": "longitude",            "description": "<p>The latitude of the user performing the action</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "uid",            "description": "<p>Used by bash tasks. User's ID. Use in conjunction with 'test'</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "test",            "description": "<p>Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'</p>"          }        ]      }    },    "examples": [      {        "title": "Example of use:",        "content": "https://efimerum-48618.appspot.com/api/v1/photos\n\n    body:\n    {\n      \"idToken\": \"XXyXX\",\n      \"latitude\": 41.375395,\n      \"longitude\": 2.170624\n    }",        "type": "json"      }    ],    "error": {      "examples": [        {          "title": "HTTP/1.1 404 Bad Request",          "content": "HTTP/1.1 404 Bad Request\n {\n   \"success\": false,\n   \"error\": \"Wrong API call (query)\"\n }",          "type": "json"        }      ]    },    "version": "0.0.0",    "filename": "./routes/api/v1/photos.js",    "groupTitle": "Photos",    "name": "PostPhotos"  },  {    "type": "post",    "url": "/pushNotification",    "title": "",    "group": "Push_Notification",    "description": "<p>Push a notification</p>",    "success": {      "fields": {        "Success 200": [          {            "group": "Success 200",            "type": "String",            "optional": false,            "field": "data",            "description": "<p>A successfull message</p>"          }        ]      },      "examples": [        {          "title": "HTTP/1.1 200 OK",          "content": "HTTP/1.1 200 OK\n{\n  \"success\": true,\n  \"data\": \"Notificación enviada!!!\"\n}",          "type": "json"        }      ]    },    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "idToken",            "description": "<p>User's ID token</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "notificationCode",            "description": "<p>Notification identifier ('LIKE')</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "photoKey",            "description": "<p>Photo identifier</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "uid",            "description": "<p>Used by bash tasks. User's ID. Use in conjunction with 'test'</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": true,            "field": "test",            "description": "<p>Used by bash tasks. Flag to bypass the authentication. Use in conjunction with 'uid'</p>"          }        ]      }    },    "examples": [      {        "title": "Example of use:",        "content": "https://efimerum-48618.appspot.com/api/v1/pushNotification\n\n    body:\n    {\n      \"idToken\": \"XXyXX\",\n      \"notificationCode\": \"LIKE\",\n      \"photoKey\": \"-Kenul0i80ubW2_CflS7\",\n    }",        "type": "json"      }    ],    "error": {      "examples": [        {          "title": "HTTP/1.1 400 Bad Request",          "content": "HTTP/1.1 400 Bad Request\n {\n   \"success\": false,\n   \"error\": \"...\"\n }",          "type": "json"        }      ]    },    "version": "0.0.0",    "filename": "./routes/api/v1/pushNotification.js",    "groupTitle": "Push_Notification",    "name": "PostPushnotification"  }] });
