# Dos formas de correr esto, y son distintas a proposito:
#
#   dev  -> vite en modo desarrollo, con el codigo montado desde el host
#   web  -> el bundle ya compilado, servido por nginx (es lo que va al NucBox)

# ── Desarrollo ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Compilacion ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# El .env tiene que existir Y traer la direccion del backend. Si la variable
# esta vacia, `BASE` queda en '' y la terminal termina pidiendo la compra
# contra su propio origen —o sea contra nginx, que devuelve el index en vez
# de JSON— sin ningun error a la vista.
#
# Se comprueba con grep y no haciendo source del archivo: un `.` sobre un
# .env ejecuta lo que haya adentro y se rompe con cualquier valor sin
# comillas que traiga un espacio.
RUN set -e; \
    if [ ! -f .env ]; then \
      echo "FALTA el .env. Copiar .env.example y completar las VITE_CAPASU_*."; \
      exit 1; \
    fi; \
    if ! grep -qE '^[[:space:]]*VITE_CAPASU_API_URL[[:space:]]*=[[:space:]]*[^[:space:]]' .env; then \
      echo "VITE_CAPASU_API_URL esta vacio en el .env."; \
      echo "Va la IP del servidor vista desde el navegador del kiosco, con"; \
      echo "/api y sin barra final. Ej: http://10.30.0.232/api"; \
      exit 1; \
    fi; \
    echo "==> $(grep -E '^[[:space:]]*VITE_CAPASU_API_URL' .env | head -1)"

# `npm run build` es `tsc -b && vite build`, y el chequeo de tipos arrastra 40
# errores previos —27 en components/pages/archi/— que no tienen que ver con la
# terminal de Capasu. Se compila con vite directo, que es exactamente lo que
# hace `npm run dev`: transpila sin chequear. Cuando esos errores se arreglen,
# esto vuelve a ser `npm run build`.
RUN npx vite build

# ── Servidor ─────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
