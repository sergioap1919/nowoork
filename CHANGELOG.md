# Changelog

## 2026-09-13 · ZIP 01 cerrado · Fundación

- Registro de Solucionador y Empresa consolidado.
- Separación estricta de roles y redirecciones por rol.
- Cierre de sesión disponible en ambos productos.
- Recuperación de contraseña y creación de nueva contraseña.
- Perfil editable de Solucionador: nombre, especialidad, experiencia y enfoque.
- Perfil editable de Empresa: responsable, nombre comercial y sector.
- Nuevo shell empresarial para que navegación, tema y cierre de sesión sean consistentes en todas las páginas de Empresa.
- El avatar de Solucionador abre su perfil.
- Nueva migración `004_profile_management.sql` con RPCs de edición segura.
- Rol, score y métricas de reputación continúan fuera del alcance de edición del navegador.
- Los mensajes de autenticación dejan de mostrar instrucciones técnicas al usuario final.

## 2026-09-13 · Flujo de registro por intención
- La portada envía “Quiero resolver decisiones” a registro con Solucionador preseleccionado.
- La portada envía “Soy una empresa” y “Conectar mi empresa” a registro con Empresa preseleccionada.
- “Crear cuenta” del menú conserva una entrada neutral: el usuario elige primero su tipo de cuenta.
- El panel de empresa incorpora cierre de sesión visible en la cabecera.

## 2026-09-13 · Integridad de rol Solucionador / Empresa

- El login deja de confiar en `user_metadata` para decidir el panel y usa `profiles.primary_role` como fuente de verdad.
- El callback de confirmación dirige al panel según el rol guardado en base de datos.
- `proxy.ts` deja de asumir que una cuenta sin perfil es solucionador.
- `/app` y `/empresa` fallan de forma segura si el perfil no existe o el rol no corresponde.
- Nueva migración `002_role_integrity.sql` para reparar cuentas empresa creadas con rol incorrecto y completar empresa/membresía si faltan.
- El trigger de altas queda endurecido para futuras cuentas.

## v0.1.0 — Foundation
- Creación de proyecto Next.js/TypeScript.
- Diseño visual Nowoork claro/oscuro.
- Landing y onboarding.
- Shell de producto para solucionadores.
- Marketplace filtrable de decisiones.
- Resultados, ranking e ingresos.
- Dashboard inicial de empresa e integraciones futuras.

## 0.1.1 - Static export command

- Added `npm run export` / `npm.cmd run export`.
- Configured Next.js `output: "export"`.
- Disabled server image optimization for compatibility with static export.
- Static output is generated in the `out/` directory.
