# CHANGELOG

## 2026-09-13 — Logo adaptativo claro/oscuro y proporciones

- Se separaron los logos oficiales para modo claro y modo oscuro.
- El logo cambia automáticamente según el tema activo sin recargar la página.
- Se normalizaron/cortaron los PNG para quitar espacio transparente excesivo y mantener proporciones consistentes.
- Se redujo el logo en navbar, sidebar, móvil, login/registro y footer.
- Se añadió inicialización temprana del tema para evitar mostrar brevemente el logo incorrecto al cargar.
- No se tocaron datos demo, flujo de decisiones ni lógica del marketplace.

# Changelog

## Export ZIP limpio
- Se agrega `npm.cmd run export` para crear un ZIP del proyecto dentro de `/export`.
- El ZIP excluye `node_modules`, `.next`, `.git`, `/export`, `/out`, `.vercel` y archivos `.env` sensibles.
- El archivo se genera con fecha y hora para evitar sobrescribir exportaciones anteriores.
