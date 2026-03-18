# 🎓 INSIGNIAS UCOL — Guía de Instalación

## Servidor de Mochila de Insignias Digitales
**Universidad de Colima — Educación Continua**

---

## Resumen ejecutivo

**Insignias UCol** es tu servidor institucional de mochila de insignias digitales, compatible con Open Badges 2.1 y diseñado para integrarse perfectamente con Moodle 4.x.

**Nombre emblemático:** "Insignias UCol"
- ✅ Claridad institucional (pertenece a la Universidad de Colima)
- ✅ Propiedad de datos (almacenamiento en servidores propios)
- ✅ Portabilidad (cumple estándar internacional)

---

## Instalación en 5 pasos

### Paso 1: Preparar el servidor

```bash
# Conectar al servidor vía SSH
ssh usuario@tu-servidor.ucol.mx

# Crear directorio
sudo mkdir -p /var/www/insignias-ucol
cd /var/www/insignias-ucol

# Dar permisos
sudo chown -R $USER:$USER /var/www/insignias-ucol
```

### Paso 2: Subir los archivos

Los archivos tienen estos nombres:

```
insignias-ucol_package.json      → package.json
insignias-ucol_README.md         → README.md
.env.example                     → .env.example
insignias-ucol_app.js            → src/app.js
db_init.js                       → src/db/init.js
middleware_oauth.js              → src/middleware/oauth.js
routes_discovery.js              → src/routes/discovery.js
routes_oauth.js                  → src/routes/oauth.js
routes_badgeconnect.js           → src/routes/badgeconnect.js
insignias-ucol_setup.js          → scripts/setup.js
```

**Opción A: Subir con scp**
```bash
# Desde tu computadora local:
scp insignias-ucol_* usuario@servidor:/var/www/insignias-ucol/
```

**Opción B: Subir vía SFTP** (usar FileZilla, Cyberduck, etc.)

Una vez subidos, renombrarlos y organizarlos:

```bash
cd /var/www/insignias-ucol

# Crear estructura
mkdir -p src/db src/middleware src/routes scripts

# Mover archivos a sus carpetas
mv insignias-ucol_package.json package.json
mv insignias-ucol_README.md README.md
mv insignias-ucol_app.js src/app.js
mv db_init.js src/db/init.js
mv middleware_oauth.js src/middleware/oauth.js
mv routes_discovery.js src/routes/discovery.js
mv routes_oauth.js src/routes/oauth.js
mv routes_badgeconnect.js src/routes/badgeconnect.js
mv insignias-ucol_setup.js scripts/setup.js

# Dar permisos de ejecución al script
chmod +x scripts/setup.js
```

### Paso 3: Instalar Node.js (si no está instalado)

```bash
# Verificar si ya tienes Node.js
node --version

# Si no, instalar (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # debe mostrar v18.x o superior
npm --version
```

### Paso 4: Instalar dependencias y configurar

```bash
cd /var/www/insignias-ucol

# Instalar dependencias
npm install

# Ejecutar asistente de configuración interactivo
npm run setup
```

El asistente te preguntará:
1. **URL pública:** `https://insignias.educacioncontinua.ucol.mx`
2. **URL de Moodle:** `https://educacioncontinua.ucol.mx`
3. **Puerto:** `3100` (o el que prefieras)
4. **Ruta BD:** `./data/backpack.db` (default está bien)

Esto crea automáticamente el archivo `.env` con todas las variables.

### Paso 5: Arrancar el servidor

**Para pruebas:**
```bash
npm start
```

**Para producción (recomendado con PM2):**
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar servidor
pm2 start src/app.js --name insignias-ucol

# Guardar configuración
pm2 save

# Configurar auto-inicio
pm2 startup
# Ejecuta el comando que PM2 te muestre
```

### Verificar funcionamiento

```bash
curl http://localhost:3100/health
```

Deberías ver:
```json
{"status":"ok","service":"Insignias UCol",...}
```

---

## Configurar Nginx (proxy reverso)

Crear `/etc/nginx/sites-available/insignias-ucol`:

```nginx
server {
    listen 80;
    server_name insignias.educacioncontinua.ucol.mx;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name insignias.educacioncontinua.ucol.mx;

    ssl_certificate     /etc/letsencrypt/live/insignias.educacioncontinua.ucol.mx/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/insignias.educacioncontinua.ucol.mx/privkey.pem;

    location / {
        proxy_pass       http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activar:
```bash
sudo ln -s /etc/nginx/sites-available/insignias-ucol /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtener certificado SSL (si no lo tienes):
```bash
sudo certbot --nginx -d insignias.educacioncontinua.ucol.mx
```

---

## Registrar en Moodle (Administrador)

### 1. Crear servicio OAuth 2

1. **Admin → Servidor → Servicios OAuth 2**
2. **"Añadir nuevo servicio OAuth 2"**
3. Tipo: **"Open Badges"**
4. **Service base URL:** `https://insignias.educacioncontinua.ucol.mx`
5. Guardar (Moodle se registra automáticamente)

### 2. Añadir backpack

1. **Admin → Badges → Gestionar mochila**
2. **"Agregar nueva mochila"**
3. Completar:
   - **URL:** `https://insignias.educacioncontinua.ucol.mx`
   - **API URL:** `https://insignias.educacioncontinua.ucol.mx`
   - **Versión:** Open Badges v2.1
   - **Servicio OAuth 2:** (el que creaste arriba)
4. Guardar

---

## Uso para estudiantes

1. **Moodle → Preferencias → Badges → Configuración de mochila**
2. Seleccionar **"Insignias UCol"**
3. Clic en **"Conectar"**
4. Introducir email y nombre
5. Clic en **"Permitir acceso"** ✅

Ahora desde **Gestionar badges** pueden enviar cualquier badge ganada a la mochila.

---

## Comandos útiles PM2

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs insignias-ucol

# Reiniciar
pm2 restart insignias-ucol

# Detener
pm2 stop insignias-ucol

# Eliminar
pm2 delete insignias-ucol
```

---

## Troubleshooting rápido

| Problema | Solución |
|---|---|
| "site not accessible" en Moodle | Verificar que Moodle pueda hacer `curl https://insignias.../. well-known/badgeconnect.json` |
| Badges no se envían | Habilitar debug en Moodle config.php, revisar logs |
| OAuth loop infinito | Verificar redirect_uris en BD SQLite |
| Puerto 3100 en uso | `sudo lsof -i :3100` y matar proceso |

---

## Soporte

- README completo: `README.md` (incluido en los archivos)
- Logs del servidor: `pm2 logs insignias-ucol`
- Health check: `https://insignias.educacioncontinua.ucol.mx/health`

---

**✅ Con esto, Insignias UCol estará funcionando y listo para recibir badges desde Moodle.**

