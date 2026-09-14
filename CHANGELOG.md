# Changelog

## 2026-09-14 · ZIP 05 · Plataforma completa

- Se agrega `008_platform_complete.sql` sin modificar migraciones anteriores.
- Se crean notificaciones internas con RLS por usuario y contador de no leídas.
- Solucionadores reciben avisos por nuevas decisiones compatibles, resultados, cambios de score y recompensas disponibles.
- Empresas reciben avisos cuando una decisión recibe una respuesta.
- Se agrega actividad empresarial auditable para creación/cambios de estado, respuestas y resultados.
- Se agrega vista de equipo empresarial mediante RPC segura sin abrir perfiles de terceros.
- Se agrega reputación agregada de empresa: decisiones evaluadas, tasa de cierre y respuestas recibidas.
- El detalle de decisión del solucionador muestra reputación básica de la empresa.
- Se agrega navegación de Notificaciones para Solucionador y Empresa, y sección Equipo para Empresa.
- Se repara una omisión detectada al auditar ZIP 04: el detalle del solucionador vuelve a mostrar estado de recompensa, base, bono y total.
- No se eliminó ningún archivo del proyecto ni se reescribieron migraciones `001`–`007`.
- Invitaciones de equipo por correo, integraciones externas y pagos reales siguen fuera de este ZIP.


## 2026-09-13 · ZIP 04 · Economía Nowoork

- Se agrega `007_economy.sql` sin modificar migraciones ya ejecutadas.
- Empresa dispone de cuenta de créditos con saldo disponible, reservado y gastado.
- Se agregan créditos de lanzamiento reclamables una sola vez por empresa para validar el circuito sin dinero real.
- Publicar una decisión reserva su exposición máxima: recompensas + bonos potenciales + fee provisional de plataforma del 15%.
- Se agregan cupos de solucionadores por decisión (1–20); al completarse los cupos la decisión se cierra automáticamente.
- La recompensa base entra al wallet como pendiente al responder.
- Al evaluar una decisión, la base se vuelve disponible y el bono se paga únicamente a respuestas clasificadas como Acierto.
- El excedente reservado vuelve al saldo de la empresa y el costo real queda registrado en la decisión.
- Decisiones con respuestas ya no pueden cancelarse; deben cerrarse y evaluarse.
- Se crean ledgers de créditos empresariales y wallet del solucionador con RLS y sin escritura directa desde navegador.
- `/empresa/creditos` muestra saldo y movimientos reales.
- `/app/ingresos` deja de usar valores demo y se alimenta de wallet/earnings reales.
- El detalle de decisión muestra reserva/costo final y el solucionador ve el estado económico de su respuesta.
- Las decisiones publicadas antes de ZIP 04 pueden seguir evaluándose para reputación; las nuevas respuestas económicas requieren decisiones financiadas después de la migración.
- Retiros, cobros con pasarela, impuestos y antifraude siguen fuera de este ZIP.

## 2026-09-13 · ZIP 03 · Resultados + reputación

- Se agrega `006_results_reputation.sql`.
- Empresa registra una sola vez el resultado real de una decisión y su confianza de atribución.
- Todas las respuestas de una decisión se evalúan de forma atómica como Acierto, Neutral o Desacierto.
- El score se modifica únicamente dentro de una RPC protegida; no existe edición directa desde el navegador.
- El impacto de score depende de dificultad y confianza de atribución.
- Se crea `score_events` como ledger inmutable con score anterior, delta y score posterior.
- Precisión, decisiones evaluadas, racha actual y mejor racha se recalculan automáticamente.
- Las evaluaciones neutrales no alteran precisión ni racha.
- Se endurece `submit_decision_answer` con bloqueo de fila para evitar carreras entre una nueva respuesta y el cierre/evaluación.
- Solucionador puede ver el resultado verificable de sus respuestas y el cambio concreto de score.
- `/app/resultados` deja de usar datos demo.
- `/app/ranking` deja de usar personas demo y se alimenta de reputación real mediante RPC segura.
- El panel de Empresa identifica decisiones ya evaluadas.
- Shopify, Meta, wallet y pagos continúan fuera de este ZIP.


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

## 2026-09-13 · ZIP 02 · Marketplace completo

- Se elimina el marketplace demo: las decisiones ahora salen de Supabase.
- Empresa puede crear borradores, editarlos, publicarlos, cerrarlos y cancelarlos.
- Panel empresa usa métricas y actividad reales.
- Solucionador ve decisiones publicadas con compatibilidad inicial por especialidad.
- Cada solucionador puede responder una decisión una sola vez.
- Empresa puede revisar los criterios recibidos sin exponer todavía identidad pública del solucionador.
- Se agrega `005_decision_marketplace.sql` con tablas, RLS, permisos y RPCs del ciclo de decisiones.
- Shopify, Meta, score por resultados y wallet siguen fuera de este ZIP por diseño.
