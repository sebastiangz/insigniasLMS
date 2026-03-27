# Backpack LMS — Open Badges 2.1

Servidor de **mochila (backpack)** institucional compatible con **Open Badges 2.1 / Badge Connect®**, diseñado para integrarse con el LMS (moodle 4.x) como backpack externo.

**InfraestructuraGIS + Tu aportación**

---

## ¿Qué hace?

El LMS (educon) ya emite insignias internamente. Este servidor es donde los estudiantes **almacenan esas insignias de forma portátil y verificable**, sin depender de servicios externos como Badgr.

```
┌─────────────────────┐   Badge Connect® (OAuth 2 + REST)    ┌─────────────────────┐
│       LMS(moodle)   │ ──────────────────────────────────▶ │   Este Backpack     │
│ educacioncontinua.  │                                      │ backpack.infraes-   │
│      ucol.mx        │ ◀──────────────────────────────────  │ tructuragis.com     │
│                     │   GET /ob/v2p1/assertions            │                     │
│  Emite badges por   │                                      │  Almacena badges    │
│  calificaciones,    │   El estudiante:                     │  que el estudiante  │
│  criterios, roles   │   Preferencias → Badges →            │ "push" desde EduCon │
└─────────────────────┘   "Conectar mochila"                 └─────────────────────┘
```

---

## Requisitos del servidor

| Componente | Versión |
|---|---|
| Sistema | Fedora Server 42 |
| Node.js | 18+ (instalado: v22.11.0) |
| Apache httpd | Con mod_proxy, mod_ssl |
| Proceso manager | PM2 |
| Base de datos | SQLite (incluida, sin configuración extra) |
| Directorio | `/home2/backpacklms` |
| Usuario | `sgonzalez` |

---

## Instalación

### 1. Clonar el repositorio

```bash
sudo mkdir -p /home2/backpacklms
sudo chown -R sgonzalez:sgonzalez /home2/backpacklms
git clone https://github.com/sebastiangz/insigniasLMS.git /home2/backpacklms
cd /home2/backpacklms
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar el entorno

```bash
# Opción A: asistente interactivo (recomendado primera vez)
npm run setup

# Opción B: copiar y editar manualmente
cp .env.example .env
nano .env
```

Variables clave en `.env`:

```bash
PORT=3600
PUBLIC_URL=https://backpack.infraestructuragis.com
DB_PATH=/home2/backpacklms/data/backpack.db
JWT_SECRET=<genera con: openssl rand -hex 48>
MOODLE_ORIGIN=https://educacioncontinua.ucol.mx
```

### 4. Instalar y configurar PM2

```bash
sudo npm install -g pm2
pm2 start src/app.js --name backpack-lms
pm2 save
pm2 startup   # ejecuta el comando que te muestre
```

### 5. Configurar Apache

```bash
sudo cp apache-vhost-backpack.conf /etc/httpd/conf.d/backpack.infraestructuragis.com.conf
sudo apachectl configtest
sudo setsebool -P httpd_can_network_connect 1   # SELinux
sudo systemctl reload httpd
```

### 6. Obtener certificado SSL

```bash
sudo dnf install -y certbot python3-certbot-apache
sudo certbot --apache -d backpack.infraestructuragis.com
```

### 7. Verificar

```bash
curl http://127.0.0.1:3100/health
# {"status":"ok","service":"Backpack LMS",...}

curl https://backpack.infraestructuragis.com/health
```

---

## Registrar en EduCon (admin)

1. **Admin → Servidor → Servicios OAuth 2**
   - Tipo: Open Badges
   - Service base URL: `https://backpack.infraestructuragis.com`
   - Dejar Client ID y secret vacíos (se generan automáticamente)

2. **Admin → Badges → Gestionar mochila**
   - Backpack URL: `https://backpack.infraestructuragis.com`
   - API URL: `https://backpack.infraestructuragis.com`
   - Versión: Open Badges v2.1
   - Servicio OAuth 2: (el del paso anterior)

EduCon descarga el manifest y se registra solo.

---

## Uso para estudiantes

1. **Preferencias → Badges → Configuración de mochila**
2. Seleccionar `backpack.infraestructuragis.com`
3. Clic "Conectar"
4. Introducir email y nombre → "Permitir acceso" ✅

---

## Estructura del proyecto

```
/home2/backpacklms/
├── package.json
├── .env                          ← tu configuración (no en git)
├── .env.example                  ← plantilla
├── apache-vhost-backpack.conf    ← config Apache
├── data/
│   └── backpack.db               ← SQLite (se crea automáticamente)
├── src/
│   ├── app.js                    ← entry point
│   ├── db/
│   │   └── init.js               ← esquema SQLite
│   ├── middleware/
│   │   └── oauth.js              ← tokens y middleware Bearer
│   └── routes/
│       ├── discovery.js          ← manifest + registro
│       ├── oauth.js              ← authorize + token
│       └── badgeconnect.js       ← API de badges
└── scripts/
    ├── setup.js                  ← asistente de configuración
    └── find-available-port.sh    ← detecta puerto libre
```

---

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/.well-known/badgeconnect.json` | Manifest (EduCon lo descarga al registrar) |
| POST | `/register` | Registro dinámico de clientes (RFC 7591) |
| GET | `/oauth/authorize` | Pantalla de consentimiento |
| POST | `/oauth/token` | Intercambio de tokens |
| GET | `/ob/v2p1/profile` | Perfil del usuario 🔒 |
| PUT | `/ob/v2p1/profile` | Actualizar perfil 🔒 |
| GET | `/ob/v2p1/assertions` | Listar badges 🔒 |
| POST | `/ob/v2p1/assertions` | Importar badge desde EduCon 🔒 |
| DELETE | `/ob/v2p1/assertions/:id` | Eliminar badge 🔒 |
| GET | `/health` | Health check |

🔒 = requiere Bearer token

---

## Comandos útiles

```bash
# Estado del servidor
pm2 status
pm2 logs backpack-lms
pm2 restart backpack-lms

# Apache
sudo systemctl reload httpd
sudo tail -f /var/log/httpd/backpack-ssl-error.log

# Base de datos
sqlite3 /home2/backpacklms/data/backpack.db
.tables
SELECT * FROM users;
SELECT client_id, name FROM oauth_clients;
.exit

# Backup
sqlite3 /home2/backpacklms/data/backpack.db .dump > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

| Problema | Solución |
|---|---|
| Servidor no arranca | `pm2 logs backpack-lms --err` — revisar puerto en uso o permisos |
| Apache no conecta | `sudo setsebool -P httpd_can_network_connect 1` (SELinux) |
| "Site not accessible" en EduCon | Verificar que `/.well-known/badgeconnect.json` responde desde Internet |
| OAuth loop infinito | Verificar `redirect_uris` en `oauth_clients` de la BD SQLite |
| Badges no se envían | Activar debug en EduCon (`$CFG->debug = E_ALL`) y revisar logs |

---

## Seguridad

- OAuth 2 Authorization Code Flow
- HTTPS obligatorio (Let's Encrypt)
- Tokens con expiración (access: 1h, refresh: 30 días)
- CORS restrictivo (solo desde EduCon)
- PM2 corre como usuario no-root (`sgonzalez`)
- SELinux compatible

---

## Licencia

GNU GPL v3 — compatible con el ecosistema LMS (moodle).
