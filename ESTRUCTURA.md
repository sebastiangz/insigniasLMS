# 📦 Estructura de archivos — Insignias UCol

## Archivos descargados de Claude

Cuando descargues todos los archivos, verás estos nombres:

```
.env.example
INSTALACION.md
README.md (este mismo archivo que estás leyendo)
package.json
app.js
db_init.js
middleware_oauth.js
routes_discovery.js
routes_oauth.js
routes_badgeconnect.js
setup.js (script de instalación)
```

---

## Cómo organizarlos en tu servidor

Crea esta estructura en `/var/www/insignias-ucol`:

```
insignias-ucol/
│
├── package.json          ← Renombrar de "package.json"
├── .env.example          ← Renombrar de ".env.example"
├── .env                  ← Lo genera npm run setup (NO descargar este)
├── README.md             ← Renombrar de "README.md"
│
├── data/                 ← Se crea automáticamente
│   └── backpack.db       ← Base de datos SQLite (generada al arrancar)
│
├── scripts/
│   └── setup.js          ← Renombrar de "setup.js"
│
└── src/
    ├── app.js            ← Renombrar de "app.js"
    │
    ├── db/
    │   └── init.js       ← Renombrar de "db_init.js"
    │
    ├── middleware/
    │   └── oauth.js      ← Renombrar de "middleware_oauth.js"
    │
    └── routes/
        ├── discovery.js      ← Renombrar de "routes_discovery.js"
        ├── oauth.js          ← Renombrar de "routes_oauth.js"
        └── badgeconnect.js   ← Renombrar de "routes_badgeconnect.js"
```

---

## Script de instalación rápida

Si prefieres automatizar la organización:

```bash
#!/bin/bash
# Ejecutar en /var/www/insignias-ucol después de subir todos los archivos

# Crear estructura
mkdir -p src/db src/middleware src/routes scripts data

# Organizar archivos descargados
# (ajusta los nombres si Claude les puso prefijos diferentes)
mv package.json package.json 2>/dev/null || true
mv app.js src/app.js
mv db_init.js src/db/init.js
mv middleware_oauth.js src/middleware/oauth.js
mv routes_discovery.js src/routes/discovery.js
mv routes_oauth.js src/routes/oauth.js
mv routes_badgeconnect.js src/routes/badgeconnect.js
mv setup.js scripts/setup.js

# Permisos
chmod +x scripts/setup.js
chmod 755 src/app.js

echo "✓ Estructura organizada"
echo "Siguiente paso: npm install"
```

Guarda esto como `organize.sh`, dale permisos y ejecútalo:

```bash
chmod +x organize.sh
./organize.sh
```

---

## Verificación

Después de organizar, verifica que todo esté en su lugar:

```bash
tree -L 3

# Deberías ver:
# insignias-ucol/
# ├── package.json
# ├── .env.example
# ├── README.md
# ├── scripts/
# │   └── setup.js
# └── src/
#     ├── app.js
#     ├── db/
#     │   └── init.js
#     ├── middleware/
#     │   └── oauth.js
#     └── routes/
#         ├── discovery.js
#         ├── oauth.js
#         └── badgeconnect.js
```

---

## ¿Por qué esta estructura?

- **`package.json`** en la raíz → estándar de Node.js
- **`src/`** → todo el código fuente
  - `app.js` → entry point
  - `db/` → lógica de base de datos
  - `middleware/` → autenticación y validaciones
  - `routes/` → endpoints REST del API
- **`scripts/`** → utilidades (instalación, migraciones futuras)
- **`data/`** → se crea solo, contiene backpack.db

Esta organización es **estándar en proyectos Node.js** y facilita:
- ✅ Entender el código de un vistazo
- ✅ Añadir nuevas rutas sin tocar el core
- ✅ Hacer backups (solo copiar `data/`)
- ✅ Actualizaciones futuras (reemplazar `src/` completo)

---

**Siguiente paso:** Lee `INSTALACION.md` para los comandos de instalación.
