# ⚡ Inicio Rápido — Insignias UCol

## Para administradores con prisa

### 1. Subir archivos al servidor

```bash
# Crear directorio
mkdir -p /var/www/insignias-ucol
cd /var/www/insignias-ucol

# Subir los archivos descargados (usando scp, sftp, etc.)
```

### 2. Organizar estructura

```bash
# Crear carpetas
mkdir -p src/db src/middleware src/routes scripts data

# Mover archivos
mv package.json ./
mv .env.example ./
mv setup.js scripts/
mv db_init.js src/db/init.js
mv middleware_oauth.js src/middleware/oauth.js
mv routes_discovery.js src/routes/discovery.js
mv routes_oauth.js src/routes/oauth.js
mv routes_badgeconnect.js src/routes/badgeconnect.js

# Crear src/app.js (descargado como app.js)
# Asegúrate de que también está en src/
```

### 3. Instalar y configurar

```bash
npm install
npm run setup  # Responde las preguntas
```

### 4. Arrancar

```bash
# Opción A: Simple
npm start

# Opción B: Con PM2 (recomendado)
npm install -g pm2
pm2 start src/app.js --name insignias-ucol
pm2 save
pm2 startup
```

### 5. Verificar

```bash
curl http://localhost:3100/health
# Debe devolver: {"status":"ok",...}
```

### 6. Nginx (si aplica)

```nginx
server {
    listen 443 ssl;
    server_name insignias.educacioncontinua.ucol.mx;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 7. Registrar en Moodle

**Admin → Servidor → OAuth 2 Services**
- Crear servicio "Open Badges"
- URL: `https://insignias.educacioncontinua.ucol.mx`

**Admin → Badges → Gestionar mochila**
- Agregar mochila
- URL: `https://insignias.educacioncontinua.ucol.mx`
- Versión: Open Badges v2.1
- OAuth: seleccionar el servicio creado arriba

---

## Probar como estudiante

1. **Preferencias → Badges → Configuración de mochila**
2. Seleccionar "Insignias UCol"
3. Clic "Conectar"
4. Introducir email/nombre → "Permitir"
5. Listo ✅

---

## Comandos útiles

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs insignias-ucol

# Reiniciar
pm2 restart insignias-ucol

# Health check
curl https://insignias.educacioncontinua.ucol.mx/health
```

---

**¿Problemas?** Lee `INSTALACION.md` para troubleshooting detallado.
