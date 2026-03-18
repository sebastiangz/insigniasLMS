#  FIREWALLD Y SEGURIDAD — Fedora Server 42

## Configuración de Firewalld (Opcional pero recomendado)

Aunque actualmente tienes el firewall desactivado, aquí están las configuraciones recomendadas para cuando decidas habilitarlo:

### 1. Estado actual del firewall

```bash
# Ver estado
sudo systemctl status firewalld

# Si está desactivado, habilitarlo:
sudo systemctl enable firewalld
sudo systemctl start firewalld
```

### 2. Reglas necesarias para el backpack

```bash
# Permitir HTTP y HTTPS (Apache)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Si necesitas SSH (probablemente ya lo tengas)
sudo firewall-cmd --permanent --add-service=ssh

# Recargar firewall
sudo firewall-cmd --reload

# Verificar reglas
sudo firewall-cmd --list-all
```

### 3. Puerto interno de Node.js

**NO es necesario abrir el puerto de Node.js** (ej: 3100) porque:
- Apache hace proxy desde 443 → 127.0.0.1:3100
- Node.js solo escucha en localhost
- El puerto nunca está expuesto a Internet

Si por alguna razón necesitas acceder directamente:
```bash
# Solo para testing/debugging (NO recomendado en producción)
sudo firewall-cmd --permanent --add-port=3100/tcp
sudo firewall-cmd --reload
```

### 4. Verificar conectividad

```bash
# Desde el servidor mismo
curl http://127.0.0.1:3100/health

# Desde otro servidor (requiere puerto abierto)
curl http://backpack.infraestructuragis.com/health
curl https://backpack.infraestructuragis.com/health
```

---

## 👤 Permisos del Usuario sgonzalez

### Grupos recomendados

```bash
# Ver grupos actuales del usuario
groups sgonzalez

# Agregar a grupos necesarios
sudo usermod -aG wheel sgonzalez      # Para usar sudo
sudo usermod -aG apache sgonzalez     # Para logs de Apache (opcional)

# Verificar
groups sgonzalez
# Debería mostrar: sgonzalez wheel apache ...
```

### Permisos del directorio /home2/backpacklms

```bash
# Propietario: sgonzalez
# Grupo: sgonzalez
sudo chown -R sgonzalez:sgonzalez /home2/backpacklms

# Permisos:
# - Directorios: 755 (rwxr-xr-x)
# - Archivos código: 644 (rw-r--r--)
# - Scripts: 755 (rwxr-xr-x)
# - .env: 600 (rw-------)  ← IMPORTANTE: solo owner

sudo find /home2/backpacklms -type d -exec chmod 755 {} \;
sudo find /home2/backpacklms -type f -exec chmod 644 {} \;
sudo chmod 755 /home2/backpacklms/*.sh
sudo chmod 600 /home2/backpacklms/.env
sudo chmod 755 /home2/backpacklms/src/app.js
```

### Base de datos SQLite

```bash
# El directorio data/ debe ser escribible por sgonzalez
sudo chown -R sgonzalez:sgonzalez /home2/backpacklms/data
sudo chmod 700 /home2/backpacklms/data  # Solo owner puede acceder
```

### Logs

```bash
# PM2 guarda logs en:
/home/sgonzalez/.pm2/logs/

# Apache guarda logs en:
/var/log/httpd/backpack-*

# Para que sgonzalez pueda leer logs de Apache:
sudo usermod -aG apache sgonzalez
```

---

##  SELinux (Fedora viene con SELinux activado)

### Verificar estado

```bash
sudo getenforce
# Debería mostrar: Enforcing
```

### Permitir que Apache haga proxy a Node.js

```bash
# Permitir httpd conectarse a servicios de red
sudo setsebool -P httpd_can_network_connect 1

# Verificar
sudo getsebool httpd_can_network_connect
# Debería mostrar: httpd_can_network_connect --> on
```

### Si tienes problemas de permisos con SQLite

```bash
# Etiquetar el directorio data/ correctamente
sudo semanage fcontext -a -t httpd_sys_rw_content_t "/home2/backpacklms/data(/.*)?"
sudo restorecon -Rv /home2/backpacklms/data

# Si semanage no está instalado:
sudo dnf install -y policycoreutils-python-utils
```

### Ver logs de SELinux si hay problemas

```bash
sudo ausearch -m avc -ts recent | grep httpd
```

---

## 🚪 Puertos usados en tu servidor

### Ver todos los puertos en uso

```bash
# Método 1: ss (moderno)
sudo ss -tulpn | grep LISTEN

# Método 2: netstat (legacy)
sudo netstat -tulpn | grep LISTEN

# Filtrar solo Node.js
sudo ss -tulpn | grep node
```

### Puertos comunes a evitar

- **80**: HTTP (Apache)
- **443**: HTTPS (Apache)
- **3000**: Suele usarse para desarrollo
- **3306**: MySQL
- **5432**: PostgreSQL
- **8080**: Aplicaciones web alternativas
- **9000**: PHP-FPM

El script `find-available-port.sh` evita automáticamente todos estos.

---

## 📝 Checklist de seguridad

- [ ] Usuario sgonzalez en grupo `wheel` (para sudo)
- [ ] Directorio `/home2/backpacklms` propiedad de sgonzalez:sgonzalez
- [ ] Archivo `.env` con permisos 600
- [ ] Directorio `data/` con permisos 700
- [ ] SELinux con `httpd_can_network_connect` habilitado
- [ ] Firewalld con HTTP/HTTPS abiertos (cuando se habilite)
- [ ] Puerto de Node.js solo en localhost (127.0.0.1)
- [ ] Certificados SSL instalados (Let's Encrypt)
- [ ] Apache proxy configurado correctamente
- [ ] PM2 corriendo como usuario sgonzalez (NO root)

---

## 🆘 Troubleshooting

### "Permission denied" en /home2/backpacklms

```bash
sudo chown -R sgonzalez:sgonzalez /home2/backpacklms
```

### "Cannot write to database"

```bash
sudo chmod 700 /home2/backpacklms/data
sudo chown -R sgonzalez:sgonzalez /home2/backpacklms/data
```

### Apache no puede conectar a Node.js

```bash
# SELinux bloqueando
sudo setsebool -P httpd_can_network_connect 1

# Firewall bloqueando localhost (raro)
sudo firewall-cmd --add-rich-rule='rule family="ipv4" source address="127.0.0.1" accept'
```

### PM2 no arranca después de reiniciar

```bash
# Verificar que el startup esté configurado
pm2 startup

# Verificar servicio systemd
sudo systemctl status pm2-sgonzalez.service
```

---

##  Referencias

- [Fedora Server Documentation](https://docs.fedoraproject.org/en-US/fedora-server/)
- [Apache mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)
- [SELinux for Apache](https://wiki.centos.org/HowTos/SELinux)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
