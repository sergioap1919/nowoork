# Changelog

## 2026-09-13 · Supabase Auth Foundation

- Integración base con Supabase SSR para Next.js 16.
- Registro real de solucionadores y empresas.
- Login real con correo y contraseña.
- Confirmación de correo mediante `/auth/callback`.
- Protección de `/app` y `/empresa` con `proxy.ts`.
- Cierre de sesión.
- Dashboard de solucionador empieza a leer nombre, score y métricas reales.
- Sidebar muestra usuario, especialidad y score reales.
- Migración `001_core.sql` con perfiles, roles, especialidades, empresas y RLS.
- Score inicial protegido: no existe policy de UPDATE directo desde cliente.
- Se elimina `output: "export"`; `npm run export` sigue siendo el empaquetador ZIP del proyecto.
- `.env.example` incluido sin secretos.

### Antes de desplegar

1. Ejecutar `npm install` para instalar `@supabase/ssr` y `@supabase/supabase-js` y actualizar `package-lock.json`.
2. Ejecutar `supabase/migrations/001_core.sql` en **nowoork-staging**.
3. Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` y Vercel staging.
4. Configurar las URLs de Auth de Supabase para localhost y staging.
5. Ejecutar `npm run build`.
