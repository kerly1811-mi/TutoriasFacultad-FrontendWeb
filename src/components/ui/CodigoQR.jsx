import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Código QR generado en el cliente a partir de un texto (p. ej. el `qr_token` de una reserva).
 * Por ahora es solo decorativo: no se escanea ni valida nada todavía.
 */
export default function CodigoQR({ valor, tamano = 160, className = '' }) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let cancelado = false;
    if (!valor) {
      setDataUrl(null);
      return undefined;
    }
    QRCode.toDataURL(valor, { width: tamano, margin: 1 })
      .then((url) => {
        if (!cancelado) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelado) setDataUrl(null);
      });
    return () => {
      cancelado = true;
    };
  }, [valor, tamano]);

  if (!valor) return null;

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Código QR de la reserva"
          width={tamano}
          height={tamano}
          className="rounded-md border border-line"
        />
      ) : (
        <div
          style={{ width: tamano, height: tamano }}
          className="flex items-center justify-center rounded-md border border-line bg-paper text-xs text-ink/40"
        >
          Generando…
        </div>
      )}
    </div>
  );
}
