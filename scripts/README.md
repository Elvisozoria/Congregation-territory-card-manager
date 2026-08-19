# Notificador de territorios

Manda un correo cuando se asigna un territorio y cuando se completa o se
devuelve. Corre como cron en GitHub Actions (`.github/workflows/notify.yml`).

| Evento | A quién |
|---|---|
| Se asigna un territorio | al publicador asignado (`assignedToUid`) |
| Pasa a `completed` o `returned` | al admin que lo asignó (`createdBy`) |

Si el admin cerró su propia asignación no se manda nada: ya lo sabe.

## Por qué un cron y no una Cloud Function

Firebase se queda en plan **Spark**, que no permite Cloud Functions. Sin un
trigger de Firestore, el disparador pasa a ser un cron:

1. El cliente marca `notifyPending: true` al crear una asignación y al cerrarla.
2. Cada 15 minutos el workflow busca esas entradas, manda el correo y limpia la
   bandera.

Repo público ⇒ minutos de Actions gratis e ilimitados. Costo total: solo SES,
US$0.10 por cada 1000 correos.

El precio de esto es la latencia: el correo llega con unos minutos de retraso,
no al instante. GitHub además suele atrasar los crons unos minutos más.

## Privacidad

La app está publicada en GitHub Pages, que es estático. Cualquier credencial en
el bundle sería pública, así que nada de esto pasa por el navegador:

- Las direcciones de correo se leen de `users/{uid}` **aquí**, con el service
  account. El cliente nunca las manda ni las ve; solo levanta una bandera
  booleana sobre una entrada de historial que ya le pertenece.
- Las llaves de SES son secrets del repositorio.
- Los sellos `notifiedAt` y `completionNotifiedAt` los escribe solo el service
  account: las reglas no dejan que un cliente los toque.

Lo único que sigue viajando en el bundle es la config pública de Firebase
(`apiKey` y compañía), que es un identificador, no un secreto: quien protege los
datos son las `firestore.rules`.

### Los logs de Actions son públicos

Los *secrets* no se ven — GitHub los guarda cifrados y los enmascara en los
logs — pero en un repo público **el log de cada corrida sí lo puede leer
cualquiera**. Por eso este script nunca escribe en el log:

- direcciones de correo completas: se ofuscan (`j***@gmail.com`);
- el cuerpo de los mensajes, que lleva nombres de publicadores y notas;
- el error crudo de `JSON.parse` sobre el service account, que incluiría un
  pedazo de la clave privada.

Al tocar el script, mantener esa regla: al log van ids de documento y conteos,
no datos de personas.

## Configuración

Secrets del repositorio (Settings → Secrets and variables → Actions):

| Secret | Qué es |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON del service account. Ya existe para el deploy — ver la nota de abajo. |
| `AWS_SES_ACCESS_KEY_ID` | Usuario IAM con permiso `ses:SendEmail` |
| `AWS_SES_SECRET_ACCESS_KEY` | Su clave |

Variables (mismo panel, pestaña *Variables*), todas opcionales:

| Variable | Default |
|---|---|
| `MAIL_FROM` | `territorios@delonix.io` |
| `APP_URL` | vacío (el correo sale sin enlace) |
| `AWS_SES_REGION` | `us-east-1` |
| `MAIL_DAILY_LIMIT` | `100` |

> **Nota sobre el service account.** El `FIREBASE_SERVICE_ACCOUNT` que ya usa
> `deploy.yml` sirve para Hosting; puede no tener permiso sobre Firestore. Si el
> workflow falla con `PERMISSION_DENIED`, agrégale el rol **Cloud Datastore
> User** en Google Cloud IAM, o crea un service account aparte y guárdalo en otro
> secret.

## Probarlo sin mandar nada

Desde la pestaña Actions, *Run workflow* con **dry run** marcado: en vez de
enviar, escribe destinatario ofuscado y asunto. Para ver el texto completo hay
que correrlo local, donde el log es tuyo:

```bash
cd scripts
npm ci
FIREBASE_SERVICE_ACCOUNT=/ruta/al/sa.json npm run dry-run
```

## El tope de gasto

Dos frenos, los dos antes de llamar a SES:

- **Por día:** incrementa `mailQuota/{YYYY-MM-DD}.sent` en una transacción y
  corta al llegar a `MAIL_DAILY_LIMIT`.
- **Por corrida:** `MAX_PER_RUN` (25) limita cuántas entradas procesa una sola
  ejecución.

La misma transacción sella la entrada, así que dos corridas solapadas no mandan
el correo dos veces. Cada evento usa su propio campo — `notifiedAt` al asignar,
`completionNotifiedAt` al cerrar — así que asignar y completar se notifican por
separado sobre el mismo documento.

Un AWS Budget solo avisa, no detiene; por eso los frenos van aquí.

## Qué NO hace

- No avisa a todos los admins al cerrar, solo al que asignó.
- No reintenta si SES rechaza el envío: la reserva del cupo ya se consumió.
  Es a propósito — un correo perdido cuesta menos que un bucle de reintentos.
  El fallo queda en el log del workflow.
- No notifica asignaciones anteriores a este cambio: solo mira entradas con la
  bandera `notifyPending`, que el cliente empieza a escribir desde ahora.
- Los correos van en español, sin plantilla configurable.
