import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/layout/AuthLayout';
import { Alert, Button, Input } from '../components/ui';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const { iniciarSesion, cargando, error } = useAuth();
  const navigate = useNavigate();

  async function manejarEnvio(e) {
    e.preventDefault();
    const exito = await iniciarSesion(correo, password);
    if (exito) navigate('/dashboard');
  }

  return (
    <AuthLayout
      titulo="Espacios FISEI"
      subtitulo="Gestión de aulas, laboratorios y tutorías"
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-azul font-semibold hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={manejarEnvio} className="bg-white border border-line rounded-lg p-7 space-y-5 shadow-2xl shadow-azul-dark/30">
        <Input
          label="Correo institucional"
          type="email"
          name="correo"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="nombre@uta.edu.ec"
        />
        <Input
          label="Contraseña"
          type="password"
          name="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <Alert>{error}</Alert>

        <Button type="submit" block cargando={cargando} textoCargando="Ingresando…">
          Ingresar
        </Button>
      </form>
    </AuthLayout>
  );
}
