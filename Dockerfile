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

# Vite resuelve las VITE_* aca, no al arrancar: quedan escritas dentro del
# bundle. Por eso el .env tiene que existir en el momento de compilar, y por
# eso cambiar la IP del backend obliga a volver a construir la imagen.
RUN test -f .env || { \
      echo "FALTA el .env: sin el, VITE_CAPASU_API_URL queda vacio y la"; \
      echo "terminal pide la compra contra su propio origen. Copiar"; \
      echo ".env.example y completar las cuatro variables VITE_CAPASU_*."; \
      exit 1; \
    }

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
