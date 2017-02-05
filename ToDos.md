1) Almacenar la geolocalización de la foto (https://firebase.googleblog.com/2014/06/geofire-20.html)

2) Almacenar el país y ciudad de la foto subida, averiguándolo de la IP

3) Al subir una foto, se debe guardar en 3 tamaños. Averiguar si GCS ofrece esa opción

4) Averiguar si Firebase pagina

5) Averiguar si Firebase te puede devolver los nodos de manera aleatoria

6) Query por etiquetas de la foto

7) Endpoints
* Dame los tags (SDK Firebase en device + estructura de Firebase)
* Dame mis tags favoritos (SDK Firebase en device + estructura de Firebase)
* Dame las fotos del tag X (Backend)
* Recordar que el tag X es favorito (SDK Firebase en device + estructura de Firebase)
* Olvidar que el tag X es favorito (SDK Firebase en device + estructura de Firebase)
* Dame las fotos aleatorias (Backend)
* Dame las fotos ordenadas por tiempo de vida, y que tengan como mínimo un tiempo de vida X (Backend)
* Dame las fotos más recientes (Backend)
* Dame las fotos más votadas (Backend)
* Subir una foto, con respuesta (Backend)

* Hacer un like a la foto X (esto desencadena una pushNotification al owner)
* Denunciar una foto
* Dame las fotos denunciadas
* Borrar una foto

8) Notificaciones
* Si le dan like a una foto tuya
