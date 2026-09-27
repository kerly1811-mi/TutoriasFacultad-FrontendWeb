import { Link } from 'react-router-dom';
import Card from '../ui/Card';

const TONOS = {
  azul: 'bg-azul text-white',
  celeste: 'bg-sky-500 text-white',
  success: 'bg-success text-white',
  amber: 'bg-orange-500 text-white',
  danger: 'bg-danger text-white',
  purpura: 'bg-purple-500 text-white',
};

/**
 * Tarjeta de estadística del panel principal: ícono de color + etiqueta + valor
 * (+ subvalor opcional, ej. "de 25").
 * Permite pasar `to` para convertirla en un acceso directo clickeable.
 */
export default function StatTile({ etiqueta, valor, subvalor, icono, tono = 'azul', to }) {
  const contenido = (
    <Card className={to ? 'hover:border-azul/40 transition-colors cursor-pointer group h-full' : 'h-full'}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink/50 truncate font-medium">{etiqueta}</p>
          <p className="font-display text-2xl text-ink mt-1.5 group-hover:text-azul transition-colors">
            {valor}
            {subvalor && <span className="text-sm font-sans font-normal text-ink/40"> {subvalor}</span>}
          </p>
        </div>
        {icono && (
          <span
            className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-transform group-hover:scale-105 ${
              TONOS[tono] || TONOS.azul
            }`}
          >
            {icono}
          </span>
        )}
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {contenido}
      </Link>
    );
  }

  return contenido;
}
