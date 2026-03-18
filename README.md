# LMS Open Badges 2.1 — Backpack Server

Un servidor de **mochila (backpack)** propio, compatible con el estándar **Open Badges 2.1 / Badge Connect®**, diseñado para registrarse directamente en un LMS cómo moodle 4.x como un backpack externo.

LMS cómo moodle ya emite insignias internamente (por calificaciones, actividades, criterios manuales, etc.). Este servidor es el lugar donde los estudiantes almacenan esas insignias de forma portátil y verificable, sin depender de servicios externos como Badgr.

---

## Cómo encaja en Moodle

```
┌─────────────────────┐        Badge Connect®           ┌──────────────────────┐
│       Moodle        │  (OAuth 2 + REST)               │   Este Backpack      │
│                     │ ──────────────────────────────▶ │                      │
│  Emite badges según │                                 │  Almacena las badges │
│  calificaciones,    │ ◀────────────────────────────── │  que los estudiantes │
│  criterios, roles   │   pull (GET /assertions)        │  "push" desde Moodle │
│  de curso, etc.     │                                 │                      │
│                     │  El estudiante hace:            │  Soporta:            │
│                     │  Preferencias → Badges →        │  • Push desde Moodle │
│                     │  Configuración mochila →        │  • Pull hacia Moodle │
│                     │  "Conectar"                     │  • Colecciones       │
└─────────────────────┘                                └──────────────────────┘
```

### Flujo paso a paso (desde la perspectiva del estudiante)

1. El administrador registra este backpack en Moodle (ver abajo).
2. El estudiante va a **Preferencias → Badges → Configuración de mochila**.
3. Selecciona este backpack como proveedor y clica **"Conectar a mochila"**.
4. Moodle redirige al endpoint `/oauth/authorize` de este servidor.
5. El estudiante introduce su correo y clica **"Permitir acceso"**.
6. Se completa el OAuth dance y Moodle guarda los tokens.
7. Ahora cuando el estudiante clica el icono de mochila junto a una badge en Moodle, esta hace un `POST /ob/v2p1/assertions` aquí.
8. La badge queda almacenada y Moodle puede leerla de vuelta con `GET /ob/v2p1/assertions`.

---

## Requisitos

- **Node.js 18+**
- Un dominio público con HTTPS (ejemplo: `backpack.infraestructuragis.com`)
- Moodle 4.0+ (tiene soporte nativo de Open Badges 2.1)
- Puerto 3001 (configurable) habilitado en el firewall

No necesitas una base de datos externa: usa **SQLite** (archivo local, cero configuración).

---

## Instalación

```bash
# 1. Clonar / copiar los archivos del servidor
cp -r backpack-server /var/www/backpack
cd /var/www/backpack

# 2. Instalar dependencias
npm install

# 3. Copiar y editar variables de entorno
cp .env.example .env
nano .env          # ← ver sección "Variables de entorno" abajo

# 4. Arrancar (desarrollo)
npm run dev

# 4b. Arrancar (producción — sin auto-restart)
npm start
```

### Producción con PM2

```bash
npm install -g pm2
pm2 start src/app.js --name "backpack"
pm2 save
pm2 startup          # para que arranque al reiniciar el servidor
```

### Variables de entorno (`.env`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto en que escucha el servidor |
| `PUBLIC_URL` | `https://backpack.dominio` | URL pública **sin** trailing slash. Aparece en los JSON de Open Badges |
| `DB_PATH` | `./data/backpack.db` | Ruta al archivo SQLite |
| `JWT_SECRET` | `(genera uno)` | Secreto para firmar tokens. Genera con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ACCESS_TOKEN_TTL` | `3600` | Vida del access_token en segundos |
| `REFRESH_TOKEN_TTL` | `2592000` | Vida del refresh_token (30 días) |
| `ALLOW_DYNAMIC_REGISTRATION` | `true` | Si es `true`, cualquier Consumer puede registrarse automáticamente |
| `MOODLE_ORIGIN` | `https://dominio` | URL de tu LMS, para CORS |

---

## Nginx (reverse proxy recomendado)

```nginx
server {
    listen 443 ssl;
    server_name backpack.dominio;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass       http://127.0.0.1:3001;
        proxy_set_header Host        $host;
        proxy_set_header X-Real-IP   $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Registrar el backpack en Moodle

Esto es lo que hace el administrador de Moodle **una sola vez**:

1. **Administración del sitio → Servidor → Servicios OAuth 2**
   - Crear un nuevo servicio de tipo **Open Badges**.
   - **Service base URL:** `https://backpack.dominio`
   - Dejar `Client ID` y `Client secret` vacíos (se generan automáticamente al crear el backpack si tienes registro dinámico habilitado).

2. **Administración del sitio → Badges → Gestionar mochila**
   - Clicar **"Agregar una nueva mochila"**.
   - **Backpack URL:** `https://backpack.dominio`
   - **Backpack API URL:** `https://backpack.dominio`
   - **Versión API soportada:** Open Badges v2.1
   - **Servicio OAuth 2:** seleccionar el que creaste en el paso anterior.
   - Guardar.

3. Moodle hará automáticamente:
   - `GET https://backpack.dominio/.well-known/badgeconnect.json` → obtiene el manifest.
   - `POST https://backpack.dominio/register` → se registra como Consumer y recibe su `client_id` y `client_secret`.

4. **Verificar:** Ve a **Administración → Badges → Configuración de badges** y confirma que aparezca tu backpack en la lista.

---

## Endpoints del servidor

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/.well-known/badgeconnect.json` | Manifest del Badge Connect (Moodle lo descarga al registrar el backpack) |
| `POST` | `/register` | Dynamic Client Registration (RFC 7591) |
| `GET` | `/oauth/authorize` | Pantalla de consentimiento del usuario |
| `POST` | `/oauth/consent` | Procesa el formulario de consentimiento |
| `POST` | `/oauth/token` | Intercambia code→tokens o refresh_token→nuevos tokens |
| `GET` | `/ob/v2p1/profile` | Perfil del usuario (requiere Bearer) |
| `PUT` | `/ob/v2p1/profile` | Actualizar perfil (requiere Bearer) |
| `GET` | `/ob/v2p1/assertions` | Listar badges de la mochila (requiere Bearer) |
| `POST` | `/ob/v2p1/assertions` | Importar una badge desde Moodle (requiere Bearer) |
| `DELETE` | `/ob/v2p1/assertions/:id` | Eliminar una badge (requiere Bearer) |
| `GET` | `/health` | Health check |

---

## Estructura del proyecto

```
backpack-server/
├── package.json
├── .env.example
├── .env                          ← (creado por ti, no se mete al repo)
├── data/
│   └── backpack.db               ← (generado automáticamente)
├── src/
│   ├── app.js                    ← Entry point
│   ├── db/
│   │   └── init.js               ← Esquema SQLite
│   ├── middleware/
│   │   └── oauth.js              ← Generación/validación de tokens y middleware Bearer
│   └── routes/
│       ├── discovery.js          ← Manifest + registro de clientes
│       ├── oauth.js              ← Authorize + Token endpoints
│       └── badgeconnect.js       ← Profile + Assertions (el API real)
└── README.md
```

---

## Troubleshooting

**"Your site is not accessible from the Internet"**
Este mensaje aparece en el LMS cuando no puede hacer GET a las assertions del issuer. Asegúrate de que tu LMS tenga una URL pública y que este backpack también sea accesible desde Internet.

**El registro dinámico falla**
Verifica que `ALLOW_DYNAMIC_REGISTRATION=true` en el `.env` y que el servidor esté corriendo. Revisa la consola del servidor para ver si recibe el `POST /register`.

**"connected" pero no aparecen badges al hacer push**
Habilita debug en tu LMS (`$CFG->debugdisplay = 1`) y revisa los logs. El problema más común es que la URL de la assertion que LMS envía no es accesible desde el backpack (subnets, firewalls, etc.).

**El OAuth dance no termina**
Revisa que el `redirect_uri` que LMS envía coincida exactamente con uno de los registrados en `oauth_clients.redirect_uris` (incluyendo protocolo y Puerto).

---

## Licencia

GNU GPL v3 o posterior — Compatible con el ecosistema de LMS cómo moodle.
