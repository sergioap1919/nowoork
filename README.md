# Nowoork v0.1 — Decision marketplace

Nowoork conecta empresas que necesitan criterio humano con solucionadores que construyen reputación a partir de resultados verificables.

## Estado actual · ZIP 03

La aplicación ya cubre tres bloques funcionales:

- **ZIP 01 · Fundación:** Auth real, roles Solucionador/Empresa, perfiles, recuperación de contraseña y seguridad base.
- **ZIP 02 · Marketplace:** Empresa crea, edita, publica, cierra y cancela decisiones; Solucionador descubre decisiones reales y responde una sola vez.
- **ZIP 03 · Resultados + reputación:** Empresa registra qué ocurrió, evalúa todas las respuestas, Nowoork actualiza score/precisión/rachas y construye historial y ranking reales.

## Migraciones ejecutables en orden

```text
001_core.sql
002_role_integrity.sql
003_data_api_permissions.sql
004_profile_management.sql
005_decision_marketplace.sql
006_results_reputation.sql
```

Las migraciones ya ejecutadas no se reescriben. Cada ZIP agrega una migración incremental.

## Regla de score en ZIP 03

El score se actualiza únicamente desde una función protegida de base de datos. El navegador no puede editarlo.

Base por dificultad:

```text
Básico:      acierto +10 | desacierto -5
Intermedio:  acierto +18 | desacierto -9
Experto:     acierto +28 | desacierto -14
Neutral:     0
```

La confianza de atribución del resultado reduce el impacto cuando la evidencia es débil:

```text
80–100% -> 100% del delta
60–79%  -> 75%
40–59%  -> 50%
1–39%   -> 25%
```

Los resultados neutrales no alteran precisión ni racha. Cada cambio genera un `score_event` inmutable.

## Próximo bloque

**ZIP 04 · Economía Nowoork**

Créditos empresariales, costo de decisiones, recompensa base, bono de resultado, wallet del solucionador y ledger financiero. Sin movimiento de dinero real todavía.

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

## Validación de ZIP 03

Después de ejecutar `006_results_reputation.sql`:

```text
Empresa publica decisión
→ Solucionador responde
→ Empresa registra resultado
→ Empresa evalúa todas las respuestas
→ decisión queda cerrada
→ score/precisión/racha se actualizan
→ Solucionador ve el resultado
→ Historial y ranking reflejan datos reales
```
