# Experimento Reacher autohospedado

Este experimento ejecuta el binario oficial `check_if_email_exists` v0.11.7 detrás de un wrapper HTTP local. No usa el backend Docker oficial porque el VPS no tiene Docker y el wrapper permite mantener el servicio aislado sin abrir otro puerto público.

## Arquitectura

- Binario: `/home/admin/reacher/bin/check_if_email_exists`
- Wrapper: `/home/admin/reacher/reacher-api.js`
- Servicio: `reacher-api.service` como servicio `systemd --user`
- Escucha únicamente en `127.0.0.1:8081`
- Autenticación mediante `x-reacher-secret`
- Máximo de dos verificaciones simultáneas
- No se envía `DATA`; Reacher solamente ejecuta la verificación SMTP

El proyecto Reacher usa licencia AGPL/comercial. Esta instalación conserva el binario y su `LICENSE.md`; no se modifica ni se incorpora al bundle propietario de Yoiber.

## Configuración de Yoiber

Para probarlo sin activar envíos:

```dotenv
EMAIL_PROVIDER=noop
EMAIL_VALIDATION_PROVIDER=reacher
EMAIL_VALIDATION_URL=http://127.0.0.1:8081/v1/check_email
EMAIL_VALIDATION_SECRET=<contenido de /home/admin/reacher/reacher.secret>
```

La opción `direct` continúa siendo la validación gratuita predeterminada. Antes de cambiar a `reacher`, comparar sus resultados con los rebotes definitivos de MailBaby. Los estados `risky` y `unknown` nunca deben convertirse automáticamente en supresión permanente.

## Prueba local en el VPS

```bash
SECRET="$(cat /home/admin/reacher/reacher.secret)"
curl -sS http://127.0.0.1:8081/healthz
curl -sS -X POST http://127.0.0.1:8081/v1/check_email \
  -H "x-reacher-secret: $SECRET" \
  -H 'content-type: application/json' \
  -d '{"to_email":"postmaster@gmail.com"}'
```

No exponer el puerto 8081 mediante Nginx o firewall. El endpoint debe ser consumido solamente por el proceso de Yoiber.
