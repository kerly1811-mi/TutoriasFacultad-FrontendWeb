// Validaciones de campo compartidas por los formularios (espejo de
// backend-facultad/utils/validadores.js).

// Cédula ecuatoriana: 10 dígitos, provincia 01-24, tercer dígito 0-6
// (persona natural) y dígito verificador por módulo 10.
export function cedulaValida(cedula) {
  if (typeof cedula !== 'string' || !/^\d{10}$/.test(cedula)) return false;

  const digitos = cedula.split('').map(Number);
  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  if (digitos[2] > 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const suma = coeficientes.reduce((acc, coef, i) => {
    let valor = digitos[i] * coef;
    if (valor > 9) valor -= 9;
    return acc + valor;
  }, 0);

  const verificador = (10 - (suma % 10)) % 10;
  return verificador === digitos[9];
}
