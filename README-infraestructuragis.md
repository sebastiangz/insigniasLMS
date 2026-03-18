# 🎓 Servidor Mochila Insignias LMS

## Open Badges 2.1 Badge Connect® Server
### InfraestructuraGIS + Universidad de Colima

Un servidor de **mochila (backpack)** institucional, compatible con el estándar **Open Badges 2.1 / Badge Connect®**, diseñado para integrarse con Moodle 4.x.

---

## ¿Qué hace este servidor?

Moodle **ya emite insignias** (badges) internamente según calificaciones, actividades, roles, etc. Este servidor es el lugar donde los estudiantes **almacenan esas insignias de forma portátil y verificable**, cumpliendo estándares internacionales.

Sin este servidor → las badges solo viven dentro de Moodle  
**Con este servidor** → las badges son portables, verificables por empleadores/otras universidades, y exportables

---

## 🏗️ Arquitectura

```
┌─────────────────────┐        Badge Connect®           ┌──────────────────────┐
│       Moodle        │  (OAuth 2 + REST)               │   Este Backpack      │
│ educacioncontinua.  │ ──────────────────────────────▶ │  backpack.infra...   │
│      ucol.mx        │                                 │   estructuragis.com  │
│                     │ ◀────────────────────────────── │                      │
│  Emite badges según │   GET /ob/v2p1/assertions       │  Almacena badges que │
│  calificaciones,    │                                 │  los estudiantes     │
│  criterios, roles   │  Estudiante:                    │  "push" desde Moodle │
│  de curso, etc.     │  Preferencias → Badges →        │                      │
│                     │  "Conectar mochila"             │  Soporta:            │
│                     │                                 │  • Push desde Moodle │
│                     │                                 │  • Pull hacia Moodle │
│                     │                                 │  • Colecciones       │
└─────────────────────┘                                └──────────────────────┘
```

---

## 📋 Requisitos

| Componente | Versión/Especificación |
|---|---|
| **Sistema Operativo** | Fedora Server 42 |
| **Node.js** | 18+ (probado con v22.11.0) |
| **httpd (Apache)** | Con mod_proxy, mod_ssl |
| **Dominio público** | backpack.infraestructuragis.com (HTTPS) |
| **Moodle** | 4.0+ (soporte nativo OB 2.1) |
| **Base de datos** | SQLite (incluida, cero configuración) |

---

## 🚀 Instalación Rápida

### Opción A: Script automatizado (Recomendado)

```bash
# Descargar e instalar todo automáticamente
curl -fsSL https://raw.githubusercontent.com/sebastiangz/insigniasLMS/main/install-backpack-fedora.sh | sudo bash
```

El script hace todo automáticamente:
- ✅ Clona el repositorio en `/home2/backpacklms`
- ✅ Detecta un puerto disponible
- ✅ Instala dependencias
- ✅ Configura `.env` con valores correctos
- ✅ Crea VirtualHost de Apache
- ✅ Instala y configura PM2
- ✅ Inicia el servidor

### Opción B: Instalación manual

Ver [INSTALACION_FEDORA.md](./INSTALACION_FEDORA.md) para instrucciones detalladas paso a paso.

---

## ⚙️ Configuración

### Variables de entorno (`.env`)

```bash
PORT=3100  # Puerto interno (Apache hace proxy a este)
PUBLIC_URL=https://backpack.infraestructuragis.com
DB_PATH=/home2/backpacklms/data/backpack.db
JWT_SECRET=<generado automáticamente>
MOODLE_ORIGIN=https://educacioncontinua.ucol.mx
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
ALLOW_DYNAMIC_REGISTRATION=true
```

Ver [.env-infraestructuragis](./.env-infraestructuragis) para plantilla completa.

### Apache VirtualHost

El script automático crea `/etc/httpd/conf.d/backpack.infraestructuragis.com.conf` con:
- Proxy desde puerto 443 → 127.0.0.1:3100
- Headers X-Forwarded-* configurados
- Soporte para WebSocket (futuro)
- Configuración SSL (certbot la completa)

---

## 🔐 Obtener certificado SSL

```bash
# Instalar certbot
sudo dnf install -y certbot python3-certbot-apache

# Obtener certificado
sudo certbot --apache -d backpack.infraestructuragis.com

# Renovación automática (certbot lo configura)
sudo certbot renew --dry-run
```

---

## 📡 Endpoints del API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/.well-known/badgeconnect.json` | Manifest Badge Connect (descubre endpoints) |
| `POST` | `/register` | Dynamic Client Registration (RFC 7591) |
| `GET` | `/oauth/authorize` | Pantalla de consentimiento OAuth |
| `POST` | `/oauth/token` | Intercambio de tokens |
| `GET` | `/ob/v2p1/profile` | Perfil del usuario 🔒 |
| `PUT` | `/ob/v2p1/profile` | Actualizar perfil 🔒 |
| `GET` | `/ob/v2p1/assertions` | Listar badges 🔒 |
| `POST` | `/ob/v2p1/assertions` | Importar badge 🔒 |
| `DELETE` | `/ob/v2p1/assertions/:id` | Eliminar badge 🔒 |
| `GET` | `/health` | Health check |

🔒 = Requiere Bearer token

---

## 🎯 Registrar en Moodle

### 1. Crear servicio OAuth 2

1. **Admin → Servidor → Servicios OAuth 2**
2. Crear nuevo servicio tipo **"Open Badges"**
3. **Service base URL:** `https://backpack.infraestructuragis.com`
4. Dejar Client ID/Secret vacíos (se autogeneran)
5. Guardar

### 2. Añadir backpack

1. **Admin → Badges → Gestionar mochila**
2. **"Agregar nueva mochila"**
3. Completar:
   - **Backpack URL:** `https://backpack.infraestructuragis.com`
   - **API URL:** `https://backpack.infraestructuragis.com`
   - **Versión:** Open Badges v2.1
   - **OAuth 2:** (seleccionar el creado arriba)
4. Guardar

Moodle descargará automáticamente el manifest y se registrará.

---

## 👤 Uso para estudiantes

1. **Preferencias → Badges → Configuración de mochila**
2. Seleccionar "backpack.infraestructuragis.com"
3. Clic **"Conectar"**
4. Introducir email y nombre
5. Clic **"Permitir acceso"** ✅

Ahora pueden enviar badges ganadas a la mochila desde:
**Preferencias → Badges → Gestionar badges** → Icono mochila junto a cada badge

---

## 🛠️ Comandos útiles

### PM2 (Gestión del proceso)

```bash
pm2 status                    # Ver estado
pm2 logs backpack-lms         # Ver logs en tiempo real
pm2 restart backpack-lms      # Reiniciar
pm2 stop backpack-lms         # Detener
pm2 monit                     # Monitor de recursos
```

### Apache

```bash
sudo systemctl restart httpd                           # Reiniciar
sudo tail -f /var/log/httpd/backpack-ssl-access.log  # Ver logs
sudo apachectl configtest                             # Verificar config
```

### Base de datos

```bash
cd /home2/backpacklms
sqlite3 data/backpack.db

# Comandos útiles:
.tables                              # Listar tablas
SELECT * FROM users;                 # Ver usuarios
SELECT * FROM oauth_clients;         # Ver clientes OAuth
SELECT * FROM assertions LIMIT 10;   # Ver badges
.exit                                # Salir
```

---

## 📂 Estructura del proyecto

```
/home2/backpacklms/
├── package.json
├── .env                          # Tu configuración (no en git)
├── .env-infraestructuragis       # Plantilla con tus URLs
├── data/
│   └── backpack.db               # Base de datos SQLite
├── src/
│   ├── app.js                    # Entry point
│   ├── db/
│   │   └── init.js               # Esquema SQLite
│   ├── middleware/
│   │   └── oauth.js              # OAuth 2 tokens
│   └── routes/
│       ├── discovery.js          # Manifest + registro
│       ├── oauth.js              # Authorize + token
│       └── badgeconnect.js       # API de badges
├── scripts/
│   ├── find-available-port.sh    # Detecta puerto libre
│   └── install-backpack-fedora.sh # Instalación automática
└── docs/
    ├── INSTALACION_FEDORA.md     # Guía detallada
    ├── FIREWALL_Y_SEGURIDAD.md   # Configuración firewall
    └── apache-vhost-backpack.conf # Configuración Apache
```

---

## 🐛 Troubleshooting

### El servidor no arranca

```bash
pm2 logs backpack-lms --err
# Ver errores comunes:
# - Puerto en uso → cambiar PORT en .env
# - Permisos → sudo chown -R sgonzalez:sgonzalez /home2/backpacklms
```

### Apache no conecta a Node.js

```bash
# SELinux bloqueando (común en Fedora)
sudo setsebool -P httpd_can_network_connect 1

# Verificar que Node.js responde
curl http://127.0.0.1:3100/health
```

### "Site not accessible" en Moodle

```bash
# Desde el servidor de Moodle:
curl https://backpack.infraestructuragis.com/.well-known/badgeconnect.json

# Debe devolver JSON con endpoints
# Si falla → verificar DNS, SSL, firewall
```

Ver [INSTALACION_FEDORA.md](./INSTALACION_FEDORA.md) para troubleshooting completo.

---

## 🔒 Seguridad

- ✅ OAuth 2 Authorization Code Flow
- ✅ HTTPS obligatorio (Let's Encrypt)
- ✅ Tokens con expiración (access: 1h, refresh: 30 días)
- ✅ CORS restrictivo (solo desde Moodle)
- ✅ SQLite con permisos 600
- ✅ SELinux compatible
- ✅ PM2 corre como usuario no-root (sgonzalez)

Ver [FIREWALL_Y_SEGURIDAD.md](./docs/FIREWALL_Y_SEGURIDAD.md) para configuración detallada.

---

## 🐳 Docker (Opcional)

Para deployment con Docker:

```bash
cd /home2/backpacklms

# Construir imagen
sudo docker build -t backpack-lms:latest .

# Iniciar con docker-compose
sudo docker-compose up -d

# Ver logs
sudo docker-compose logs -f backpack
```

Ver [docker-compose.yml](./docker-compose.yml) para configuración.

---

## 📊 Mantenimiento

### Backups automáticos

```bash
# Agregar a crontab
0 2 * * * sqlite3 /home2/backpacklms/data/backpack.db .dump > /home2/backups/backpack_$(date +\%Y\%m\%d).sql
```

### Actualizar desde Git

```bash
cd /home2/backpacklms
git pull origin main
npm install
pm2 restart backpack-lms
```

### Monitoreo

Configurar un servicio de uptime monitoring:
- URL: `https://backpack.infraestructuragis.com/health`
- Frecuencia: cada 5 minutos
- Alerta si status != 200

---

## 📚 Documentación

- [INSTALACION_FEDORA.md](./docs/INSTALACION_FEDORA.md) — Instalación detallada paso a paso
- [FIREWALL_Y_SEGURIDAD.md](./docs/FIREWALL_Y_SEGURIDAD.md) — Configuración de firewall, SELinux, permisos
- [Open Badges 2.1 Spec](https://www.imsglobal.org/spec/ob/v2p1) — Especificación oficial
- [Moodle Badges Docs](https://docs.moodle.org/en/Badges) — Documentación de Moodle

---

## 🆘 Soporte

- **Health check:** https://backpack.infraestructuragis.com/health
- **Manifest:** https://backpack.infraestructuragis.com/.well-known/badgeconnect.json
- **Logs PM2:** `pm2 logs backpack-lms`
- **Logs Apache:** `/var/log/httpd/backpack-*`
- **GitHub Issues:** https://github.com/sebastiangz/insigniasLMS/issues

---

## 📜 Licencia

GNU GPL v3 or later — Compatible con ecosistema Moodle

---

## 👥 Créditos

**Desarrollado para:**
- Universidad de Colima — Educación Continua
- InfraestructuraGIS

**Tecnologías:**
- Node.js v22
- Express.js
- SQLite
- Open Badges 2.1 (IMS Global / 1EdTech)
- OAuth 2.0 (RFC 6749, RFC 7591)

---

**✅ Sistema listo para producción en Fedora Server 42 con httpd**
