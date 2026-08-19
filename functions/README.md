# Notificaciones por correo

Una sola función: `notifyOnAssignment`. Se dispara cuando se crea un documento en
`congregations/{congId}/history/{histId}` y le manda un correo al publicador
asignado, vía Amazon SES.

## Por qué una Cloud Function y no el cliente

La app se publica en GitHub Pages, que es estático. Cualquier credencial que
pusiéramos en el bundle sería pública. Con la función:

- Las direcciones de correo se leen de `users/{uid}` **dentro** de la función.
  El cliente nunca las manda ni las ve.
- Las llaves de SES viven en Secret Manager, nunca en el bundle.
- No hay endpoint HTTP que llamar: el disparador es la escritura en Firestore,
  que ya está restringida a admins por `firestore.rules`. Nadie puede provocar
  un envío sin poder asignar territorios.

Lo único que sigue viajando en el bundle es la config pública de Firebase
(`apiKey` y compañía), que es un identificador, no un secreto: quien protege los
datos son las reglas de Firestore.

## Requisitos

- Plan **Blaze** en el proyecto de Firebase (Cloud Functions no corre en Spark).
- Un dominio o remitente verificado en SES, y la cuenta fuera del sandbox si los
  destinatarios no están verificados uno por uno.
- Un usuario IAM con permiso `ses:SendEmail`.

## Configuración

Parámetros (`firebase functions:config` ya no aplica; son params de v2, se piden
al desplegar o se ponen en `.env` dentro de `functions/`):

| Param | Qué es | Default |
|---|---|---|
| `MAIL_FROM` | Remitente verificado en SES | — (obligatorio) |
| `APP_URL` | URL pública de la app, para el enlace del correo | — |
| `AWS_SES_REGION` | Región de SES | `us-east-1` |
| `MAIL_DAILY_LIMIT` | Tope de correos por día | `100` |

Secretos:

```bash
firebase functions:secrets:set AWS_SES_ACCESS_KEY_ID
firebase functions:secrets:set AWS_SES_SECRET_ACCESS_KEY
```

Desplegar:

```bash
firebase deploy --only functions
```

## El tope de gasto

El control real está en la función, no en AWS: antes de cada envío incrementa
`mailQuota/{YYYY-MM-DD}.sent` en una transacción y corta al llegar a
`MAIL_DAILY_LIMIT`. Si algo entra en bucle, se detiene **antes** de llamar a SES,
así que no hay forma de que dispare la factura.

Esa misma transacción marca `notifiedAt` en la entrada de historial, así que un
reintento del trigger (son at-least-once) no manda el correo dos veces.

Para subir o bajar el tope no hace falta tocar código: cambia
`MAIL_DAILY_LIMIT` y vuelve a desplegar.

Como segunda red, opcional, en AWS: un Budget con alerta, o un Configuration Set
de SES con alarma de CloudWatch sobre la métrica `Send`.

## Qué NO hace

- No notifica al completar ni al devolver un territorio, sólo al asignar.
- No reintenta si SES rechaza el envío: la reserva del cupo ya se consumió.
  Es a propósito — un correo perdido cuesta menos que un bucle de reintentos.
  El fallo queda en los logs (`firebase functions:log`).
- Los correos van en español, sin plantilla configurable.
