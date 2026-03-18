#  INSTALACIÓN COMPLETA — Fedora Server 42

## Servidor Mochila Insignias LMS
### InfraestructuraGIS + Universidad de Colima

---

##  Pre-requisitos

✅ **Sistema:** Fedora Server 42  
✅ **Usuario:** sgonzalez (con sudo)  
✅ **Node.js:** v22.11.0 (ya instalado)  
✅ **httpd:** Ya configurado con otras apps  
✅ **Directorio:** /home2/backpacklms  
✅ **URLs:**
- Backpack: https://backpack.infraestructuragis.com
- LMS(Moodle): https://educacioncontinua.ucol.mx

---

##  Instalación Automática (Recomendado)

### Opción 1: Script completo (un solo comando)

```bash
# Descargar e instalar todo automáticamente
curl -fsSL https://raw.githubusercontent.com/sebastiangz/insigniasLMS/main/install-backpack-fedora.sh | sudo bash
```

### Opción 2: Instalación manual paso a paso

Si prefieres control total o el script falla, sigue estos pasos:

```bash
# 1. Cambiar a usuario con sudo
su - sgonzalez

# 2. Clonar repositorio
sudo mkdir -p /home2/backpacklms
sudo chown -R sgonzalez:sgonzalez /home2/backpacklms
git clone https://github.com/sebastiangz/insigniasLMS.git /home2/backpacklms
cd /home2/backpacklms

# 3. Organizar estructura
bash organize.sh

# 4. Instalar dependencias
npm install

# 5. Detectar puerto disponible
bash find-available-port.sh
# Anota el puerto que te muestre (ej: 3100)

# 6. Configurar variables de entorno
cp .env-infraestructuragis .env
nano .env
# Editar:
#   - PORT=<puerto_detectado>
#   - JWT_SECRET=<generar uno nuevo>

# Generar JWT_SECRET:
openssl rand -hex 48

# 7. Instalar PM2
sudo npm install -g pm2

# 8. Iniciar aplicación
pm2 start src/app.js --name backpack-lms
pm2 save
pm2 startup

# 9. Configurar Apache
sudo cp apache-vhost-backpack.conf /etc/httpd/conf.d/backpack.infraestructuragis.com.conf
# Editar el puerto en el archivo si es necesario:
sudo nano /etc/httpd/conf.d/backpack.infraestructuragis.com.conf
# Cambiar "3100" por el puerto que detectaste

# 10. Verificar configuración Apache
sudo apachectl configtest

# 11. Habilitar módulos necesarios (si no están)
sudo dnf install -y mod_ssl mod_proxy mod_proxy_http mod_headers mod_rewrite

# 12. Reiniciar Apache
sudo systemctl restart httpd

# 13. Obtener certificado SSL
sudo dnf install -y certbot python3-certbot-apache
sudo certbot --apache -d backpack.infraestructuragis.com
# Seguir instrucciones en pantalla

# 14. Verificar funcionamiento
curl http://127.0.0.1:3100/health  # (usa tu puerto)
curl https://backpack.infraestructuragis.com/health
```

---

##  Verificación Post-Instalación

### 1. Verificar que Node.js está corriendo

```bash
pm2 status
# Debe mostrar: backpack-lms | online

pm2 logs backpack-lms --lines 50
# Debe mostrar el banner con:
# ✓ Servidor iniciado correctamente
# ✓ Visita https://backpack.infraestructuragis.com
```

### 2. Verificar Apache

```bash
sudo systemctl status httpd
# Debe mostrar: active (running)

# Ver logs
sudo tail -f /var/log/httpd/backpack-ssl-access.log
```

### 3. Verificar conectividad

```bash
# Desde el servidor
curl -v http://127.0.0.1:3100/health

# Desde Internet (requiere DNS configurado)
curl -v https://backpack.infraestructuragis.com/health

# Debe devolver:
# {"status":"ok","service":"Insignias UCol",...}
```

### 4. Verificar SSL

```bash
# Comprobar certificado
echo | openssl s_client -connect backpack.infraestructuragis.com:443 2>/dev/null | openssl x509 -noout -dates

# Probar HTTPS
curl -I https://backpack.infraestructuragis.com
# Debe devolver: HTTP/2 200
```

---

##  Configuración en el LMS(Moodle)

### 1. Crear servicio OAuth 2

1. **Administración del sitio → Servidor → Servicios OAuth 2**
2. Clic en **"Añadir un nuevo servicio OAuth 2"**
3. Seleccionar tipo: **"Open Badges"**
4. **Service base URL:** `https://backpack.infraestructuragis.com`
5. Dejar **Client ID** y **Client secret** vacíos
6. **Guardar cambios**

LMS automáticamente:
- Descargará el manifest desde `/.well-known/badgeconnect.json`
- Se registrará y obtendrá su `client_id` y `client_secret`

### 2. Añadir backpack

1. **Administración del sitio → Badges → Gestionar mochila**
2. Clic en **"Agregar una nueva mochila"**
3. Completar:
   - **Backpack URL:** `https://backpack.infraestructuragis.com`
   - **Backpack API URL:** `https://backpack.infraestructuragis.com`
   - **Versión API soportada:** **Open Badges v2.1**
   - **Servicio OAuth 2:** (seleccionar el creado en paso 1)
4. **Guardar cambios**

### 3. Establecer como backpack por defecto (opcional)

1. **Administración del sitio → Badges → Configuración de badges**
2. **Backpack externo por defecto:** Seleccionar "backpack.infraestructuragis.com"
3. **Guardar cambios**

---

## 👤 Prueba desde un estudiante

1. Iniciar sesión en el LMS(Moodle) como estudiante
2. Ir a **Preferencias** (menú usuario arriba derecha)
3. Bajo **Badges**, clic en **"Configuración de mochila"**
4. **Proveedor de mochila:** Seleccionar "backpack.infraestructuragis.com"
5. Clic en **"Conectar a mochila"**
6. En la pantalla de consentimiento:
   - Introducir email del estudiante
   - Introducir nombre
   - Clic en **"Permitir acceso"**
7. Serás redirigido a Moodle con mensaje: "Mochila conectada" ✅

Ahora el estudiante puede enviar badges:
1. **Preferencias → Badges → Gestionar badges**
2. Junto a cada badge ganada verás un icono de mochila
3. Clic en el icono → Badge se envía al backpack
4. Confirmación: "Added badge to backpack"

---

##  Comandos útiles

### PM2

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs backpack-lms

# Reiniciar
pm2 restart backpack-lms

# Detener
pm2 stop backpack-lms

# Ver consumo de recursos
pm2 monit
```

### Apache

```bash
# Reiniciar
sudo systemctl restart httpd

# Ver logs
sudo tail -f /var/log/httpd/backpack-ssl-error.log
sudo tail -f /var/log/httpd/backpack-ssl-access.log

# Ver configuración VirtualHost
sudo httpd -S | grep backpack
```

### Base de datos SQLite

```bash
cd /home2/backpacklms

# Abrir consola SQLite
sqlite3 data/backpack.db

# Ver tablas
.tables

# Ver usuarios
SELECT * FROM users;

# Ver clientes OAuth (Moodle)
SELECT client_id, name FROM oauth_clients;

# Salir
.exit
```

### Logs del sistema

```bash
# Ver todos los servicios relacionados
sudo journalctl -u httpd -u pm2-sgonzalez --since "1 hour ago"

# Ver solo errores
sudo journalctl -p err -b
```

---

##  Troubleshooting

### El servidor no arranca

```bash
# Ver logs de PM2
pm2 logs backpack-lms --err --lines 100

# Problemas comunes:
# 1. Puerto en uso
sudo ss -tulpn | grep :<puerto>
# Solución: Cambiar PORT en .env

# 2. Permisos del directorio
sudo chown -R sgonzalez:sgonzalez /home2/backpacklms

# 3. Base de datos corrupta
rm /home2/backpacklms/data/backpack.db
pm2 restart backpack-lms  # Se recrea automáticamente
```

### Apache no puede conectar a Node.js

```bash
# 1. Verificar que Node.js responde
curl http://127.0.0.1:3100/health

# 2. SELinux bloqueando (común en Fedora)
sudo setsebool -P httpd_can_network_connect 1

# 3. Verificar proxy en configuración Apache
sudo grep ProxyPass /etc/httpd/conf.d/backpack.infraestructuragis.com.conf
# Debe apuntar al puerto correcto
```

### "Site not accessible from the Internet" en el LMS

```bash
# Desde el servidor de LMS, ejecutar:
curl https://backpack.infraestructuragis.com/.well-known/badgeconnect.json

# Si falla:
# - Verificar DNS: nslookup backpack.infraestructuragis.com
# - Verificar firewall: sudo firewall-cmd --list-all
# - Verificar certificado SSL
```

### Badges no se envían desde el LMS

```bash
# 1. Habilitar debug en el LMS
# En config.php:
# $CFG->debug = (E_ALL | E_STRICT);
# $CFG->debugdisplay = 1;

# 2. Intentar enviar badge de nuevo y copiar el error

# 3. Ver logs del backpack
pm2 logs backpack-lms

# 4. Problema común: URL de assertion no accesible
# La URL de la assertion debe ser accesible desde backpack.infraestructuragis.com
```

### OAuth dance no termina (loop infinito)

```bash
# Verificar redirect_uris en la BD
sqlite3 /home2/backpacklms/data/backpack.db
SELECT client_id, redirect_uris FROM oauth_clients;

# Si no coincide con la URL del LMS, actualizar:
UPDATE oauth_clients 
SET redirect_uris = '["https://educacioncontinua.ucol.mx/admin/oauth2callback.php"]' 
WHERE client_id = '<client_id>';
```

---

##  Mantenimiento

### Backups automáticos

```bash
# Crear script de backup
sudo nano /home2/backpacklms/backup.sh
```

Contenido del script:

```bash
#!/bin/bash
BACKUP_DIR="/home2/backups/backpacklms"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sqlite3 /home2/backpacklms/data/backpack.db .dump > $BACKUP_DIR/backpack_$TIMESTAMP.sql
# Mantener solo últimos 30 días
find $BACKUP_DIR -name "backpack_*.sql" -mtime +30 -delete
```

Agregar a crontab:

```bash
crontab -e
# Agregar:
0 2 * * * /home2/backpacklms/backup.sh
```

### Actualizar desde Git

```bash
cd /home2/backpacklms
git pull origin main
npm install  # por si hay nuevas dependencias
pm2 restart backpack-lms
```

### Monitoreo de uptime

Usa un servicio externo como:
- [UptimeRobot](https://uptimerobot.com) (gratis)
- [Pingdom](https://www.pingdom.com)
- [Freshping](https://www.freshworks.com/website-monitoring/)

URL a monitorear: `https://backpack.infraestructuragis.com/health`

---

##  Migración a Docker (Futuro)

Cuando se decida migrar a Docker:

```bash
cd /home2/backpacklms

# Construir imagen
sudo docker build -t backpack-lms:latest .

# Iniciar con docker-compose
sudo docker-compose up -d

# Ver logs
sudo docker-compose logs -f backpack

# Detener PM2 para evitar conflictos
pm2 stop backpack-lms
pm2 delete backpack-lms
```

Actualizar Apache para apuntar al puerto de Docker.

---

##  Referencias

- [Documentación Open Badges 2.1](https://www.imsglobal.org/spec/ob/v2p1)
- [Moodle Badges Documentation](https://docs.moodle.org/en/Badges)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Apache mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

##  Soporte

- **Logs:** `pm2 logs backpack-lms`
- **Health check:** `https://backpack.infraestructuragis.com/health`
- **Manifest:** `https://backpack.infraestructuragis.com/.well-known/badgeconnect.json`
- **GitHub Issues:** https://github.com/sebastiangz/insigniasLMS/issues

---

**OK Instalación completada. El servidor está listo para recibir badges desde el LMS.**
