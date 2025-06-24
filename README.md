# Cautive-Portal-with-Auth

# Instrucciones para el despliegue y configuración

1. Asegúrate de tener Docker y Docker Compose instalados.
2. Ajusta las contraseñas y variables de entorno en `docker-compose.yml` según tus necesidades.
3. El directorio `freeradius` debe contener la configuración personalizada para que FreeRadius use MySQL (ver archivo `sql`).
4. El portal cautivo es un ejemplo en Go, puedes mejorarlo para consultar realmente a FreeRadius vía protocolo RADIUS.
5. Ejecuta:

```bash
docker-compose up --build
```

6. Accede al portal cautivo en http://localhost:8080

---

**Notas:**
- Para producción, asegúrate de hashear las contraseñas y usar HTTPS.
- Puedes ampliar la lógica del portal cautivo para consultar a FreeRadius usando una librería Go como `github.com/bronze1man/radius`.
- FreeRadius requiere configuración adicional para mapear la tabla `usuarios` a su esquema de autenticación.