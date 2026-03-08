# Nexus Frontend

## Variables de entorno

El proyecto usa estas variables para conectar el modulo de autenticacion:

```bash
NEXT_PUBLIC_API_BASE_URL=https://nexus-api-xhe7.onrender.com
NEXT_PUBLIC_AUTH_PROVIDER=api
```

`NEXT_PUBLIC_AUTH_PROVIDER` admite:

- `api`: usa la API real desplegada
- `mock`: mantiene el flujo simulado actual

## Desarrollo local

```bash
npm run dev
```

## Despliegue en Vercel

Configura las mismas variables en el proyecto de Vercel:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_AUTH_PROVIDER`

Si el backend responde desde otro origen, valida tambien la configuracion de CORS en la API.
