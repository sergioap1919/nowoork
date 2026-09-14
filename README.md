# Nowoork v0.1 — Foundation

Nowoork es una plataforma donde empresas publican decisiones que necesitan criterio humano y solucionadores construyen reputación a partir de resultados verificables.

## Estado actual · ZIP 01

La fundación de identidad y acceso ya incluye:

- Landing pública con entradas diferenciadas para Solucionador y Empresa.
- Registro real con Supabase Auth.
- Confirmación de correo.
- Roles persistentes y mutuamente excluyentes: `solver` / `company`.
- Redirección segura según rol.
- Login y cierre de sesión en ambos lados.
- Recuperación y cambio de contraseña.
- Perfil básico editable para Solucionador.
- Perfil básico editable para Empresa.
- Score y rol protegidos contra edición directa desde el navegador.
- RLS y permisos mínimos para la Data API.
- Modo claro/oscuro.
- Export ZIP limpio con `npm run export`.

## Migraciones ejecutables en orden

```text
001_core.sql
002_role_integrity.sql
003_data_api_permissions.sql
004_profile_management.sql
```

Las migraciones ya ejecutadas no se reescriben. Cada nuevo bloque agrega una migración incremental.

## Próximo bloque

**ZIP 02 · Marketplace completo**

Empresa crea, edita, publica y cancela decisiones reales; Solucionador descubre decisiones reales, filtra y responde una única vez.

## Desarrollo local

```bash
npm install
npm run dev
```

Variables requeridas en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env.local` nunca debe subirse a Git.
