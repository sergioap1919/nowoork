# Nowoork v0.1 — Decision operating system

Nowoork conecta empresas que necesitan tomar mejores decisiones con solucionadores que construyen reputación a partir de resultados verificables. La visión de producto incorpora tres actores: **Empresa + IA + Solucionador**.

## Estado actual · ZIP 05

La aplicación ya cubre cuatro bloques funcionales:

- **ZIP 01 · Fundación:** Auth real, roles Solucionador/Empresa, perfiles, recuperación de contraseña y seguridad base.
- **ZIP 02 · Marketplace:** Empresa crea, edita, publica, cierra y cancela decisiones; Solucionador descubre decisiones reales y responde una sola vez.
- **ZIP 03 · Resultados + reputación:** Empresa registra qué ocurrió, evalúa todas las respuestas y Nowoork actualiza score, precisión, rachas, historial y ranking.
- **ZIP 04 · Economía interna:** créditos empresariales, reserva de presupuesto, recompensa base, bono por acierto, wallet del solucionador y ledgers auditables. Todavía no mueve dinero real.
- **ZIP 05 · Plataforma completa:** notificaciones internas, actividad auditable, reputación agregada de empresa, vista de equipo y navegación operativa.

## Migraciones ejecutables en orden

```text
001_core.sql
002_role_integrity.sql
003_data_api_permissions.sql
004_profile_management.sql
005_decision_marketplace.sql
006_results_reputation.sql
007_economy.sql
008_platform_complete.sql
```

Las migraciones ya ejecutadas no se reescriben. Cada ZIP agrega una migración incremental.

## Economía definida en ZIP 04

Una decisión define:

```text
recompensa base por solucionador
+ bono por acierto
× número máximo de solucionadores
+ fee provisional de simulación (15%)
= reserva máxima al publicar
```

Reglas:

- La recompensa base queda **pendiente** cuando el solucionador responde.
- El bono se paga únicamente si la respuesta termina evaluada como **Acierto**.
- La empresa reserva la exposición máxima al publicar.
- Al evaluar se cobra únicamente el costo real y se libera el excedente reservado.
- Si una decisión publicada todavía no tiene respuestas, cerrarla o cancelarla libera toda la reserva.
- Si ya tiene respuestas no puede cancelarse: debe cerrarse y evaluarse.
- Al llenarse todos los cupos, la decisión se cierra automáticamente a nuevas respuestas.
- Los créditos de lanzamiento son internos y no equivalen a dinero real ni son retirables.

## Score

El score continúa protegido en base de datos y solo cambia a partir de resultados verificados. Los eventos de score y los movimientos económicos quedan separados para poder auditar reputación y dinero de forma independiente.

## Próximo bloque

**ZIP 06 · Shopify Nowoork**

Infraestructura de integración y aplicación Shopify exclusiva de Nowoork. El objetivo será conectar datos de pedidos/productos necesarios para que Nowoork empiece a detectar situaciones de decisión sin convertirse en un CRM gigante.

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

## Validación de ZIP 05

Después de ejecutar `008_platform_complete.sql`:

```text
Empresa publica una decisión
→ Solucionador compatible recibe notificación
→ Solucionador responde
→ Empresa recibe notificación y actividad
→ Empresa registra/evalúa resultado
→ Solucionador recibe resultado + cambio de score + recompensa
→ ambos centros de Notificaciones pueden marcar eventos como leídos
→ Empresa ve actividad reciente y su equipo actual
→ Solucionador ve reputación agregada de la empresa en el detalle
```

La vista de Equipo es de lectura en este ZIP. Invitaciones y envío de correo se implementarán cuando exista el flujo de comunicación seguro correspondiente.
