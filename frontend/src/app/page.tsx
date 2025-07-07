'use client';
import { loginAuth } from "@/api/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await loginAuth(username, password);
      if (res.data.success) {
        console.log("Login exitoso:", res.data);
        // Redirigir a la página de bienvenida con los datos del usuario y tiempo
        router.push(
          `/bienvenida?user=${encodeURIComponent(
            res.data.user
          )}&tiempo=${res.data.tiempo}`
        );
      } else {
        setError(res.data.error || "Error desconocido");
      }
    } catch {
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-white">
      <div className="bg-white/90 rounded-xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-blue-600 mb-2 text-center">
          Dulcería{" "}
          <span className="text-blue-400">Macam</span>
        </h1>
        <p className="text-gray-500 mb-6 text-center">
          Acceso WiFi para clientes
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-gray-700 font-medium mb-1"
              htmlFor="username"
            >
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label
              className="block text-gray-700 font-medium mb-1"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="bg-red-100 text-red-700 rounded-md px-3 py-2 mb-3 text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md transition"
          >
            Ingresar
          </button>
        </form>
      </div>
      <div className="mt-8 text-gray-400 text-sm">
        &copy; 2025 Dulcería Macam. Todos los derechos reservados.
      </div>
    </div>
  );
}
