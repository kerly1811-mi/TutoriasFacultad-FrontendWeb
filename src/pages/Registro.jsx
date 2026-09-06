import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import AuthLayout from '../components/layout/AuthLayout';
import { Alert, Button, Input } from '../components/ui';

// El registro público solo crea estudiantes (el backend fuerza el rol).
// Docentes, laboratoristas y administradores los da de alta un administrador.
export default function Registro() {
  const { valores, handleChange } = useForm({
    cedula: '',
    nombres: '',
    apellidos: '',
    correo: '',
    password: '',
  });
  const [exito, setExito] = useState(false);
  const { registrar, cargando, error } = useAuth();
  const navigate = useNavigate();

  async function manejarEnvio(e) {
    e.preventDefault();
    const ok = await registrar(valores);
    if (ok) {
      setExito(true);
      setTimeout(() => navigate('/login'), 1200);
    }
  }

  return (
    <AuthLayout
      ancho="max-w-md"
      titulo="Crear cuenta de estudiante"
      subtitulo="El registro está disponible únicamente para estudiantes"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-azul font-semibold hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form
        onSubmit={manejarEnvio}
        className="bg-white border border-line rounded-lg p-7 space-y-4 shadow-2xl shadow-azul-dark/20"
      >
        <Input
          label="Cédula"
          name="cedula"
          required
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          title="La cédula debe tener 10 dígitos numéricos."
          value={valores.cedula}
          onChange={handleChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombres" name="nombres" required value={valores.nombres} onChange={handleChange} />
          <Input
            label="Apellidos"
            name="apellidos"
            required
            value={valores.apellidos}
            onChange={handleChange}
          />
        </div>

        <Input
          label="Correo institucional"
          type="email"
          name="correo"
          required
          value={valores.correo}
          onChange={handleChange}
          placeholder="nombre@uta.edu.ec"
        />

        <Input
          label="Contraseña"
          type="password"
          name="password"
          required
          minLength={6}
          value={valores.password}
          onChange={handleChange}
          placeholder="Mínimo 6 caracteres"
        />

        <Alert>{error}</Alert>
        {exito && <Alert variant="success">Cuenta creada. Redirigiendo al inicio de sesión…</Alert>}

        <Button type="submit" block cargando={cargando} textoCargando="Creando cuenta…">
          Crear cuenta
        </Button>

        <p className="text-xs text-ink/50 text-center pt-1">
          ¿Eres docente, laboratorista o administrador? Solicita tu cuenta al administrador del sistema.
        </p>
      </form>
    </AuthLayout>
  );
}
