# Nexus Frontend

## Variables de entorno

El proyecto usa estas variables para conectar el modulo de autenticacion:

```bash
NEXT_PUBLIC_API_TARGET=deployed
NEXT_PUBLIC_DEPLOYED_API_BASE_URL=https://nexus-api-xhe7.onrender.com
NEXT_PUBLIC_LOCAL_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_AUTH_PROVIDER=api
```

`NEXT_PUBLIC_API_TARGET` admite:

- `deployed`: usa la API desplegada
- `local`: usa la API local en `NEXT_PUBLIC_LOCAL_API_BASE_URL`

`NEXT_PUBLIC_AUTH_PROVIDER` admite:

- `api`: usa la API real desplegada
- `mock`: mantiene el flujo simulado actual, solo permitido con `NODE_ENV=development`

## Cambio rapido entre API desplegada y local

Para seguir desarrollando contra la API desplegada:

```bash
NEXT_PUBLIC_API_TARGET=deployed
```

Para probar cambios locales del backend sin tocar produccion:

```bash
NEXT_PUBLIC_API_TARGET=local
```

`.env.local` es solo local y no se despliega a produccion. En Vercel debes definir las variables del ambiente productivo por separado.

## Desarrollo local

```bash
npm run dev
```

## Despliegue en Vercel

Configura las mismas variables en el proyecto de Vercel:

- `NEXT_PUBLIC_API_TARGET`
- `NEXT_PUBLIC_DEPLOYED_API_BASE_URL`
- `NEXT_PUBLIC_AUTH_PROVIDER`

Si el backend responde desde otro origen, valida tambien la configuracion de CORS en la API.
