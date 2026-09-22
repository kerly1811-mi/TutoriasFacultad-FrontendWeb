import Card from '../ui/Card';

const ABREV = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Mini gráfico de barras verticales Lun-Dom, con una o dos series.
 * series: [{ nombre, color: 'bg-azul'|'bg-celeste'|..., datos: [7 números, Lun..Dom] }]
 */
export default function BarrasSemana({ titulo, series, altura = 80 }) {
  const max = Math.max(1, ...series.flatMap((s) => s.datos));

  return (
    <Card padding="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display text-base text-ink">{titulo}</p>
        {series.length > 1 && (
          <div className="flex items-center gap-3 text-xs text-ink/50">
            {series.map((s) => (
              <span key={s.nombre} className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${s.color}`} /> {s.nombre}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2" style={{ height: altura }}>
        {ABREV.map((dia, i) => (
          <div key={dia} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: altura - 18 }}>
              {series.map((s) => (
                <div
                  key={s.nombre}
                  className={`flex-1 rounded-sm ${s.color} min-h-[2px]`}
                  style={{ height: `${(s.datos[i] / max) * 100}%` }}
                  title={`${s.nombre}: ${s.datos[i]}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-ink/40">{dia}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
