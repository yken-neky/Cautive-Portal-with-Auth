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
    <div className="min-h-screen flex flex-col justify-center items-center bg-transparent">
      <div className="bg-white/80 rounded-3xl shadow-2xl p-12 max-w-2xl w-full border-none backdrop-blur-md form-float">
        <h1 className="text-3xl font-extrabold text-rose-600 mb-2 text-center drop-shadow">
          SayCheese <span className="text-yellow-500">- Dulcería</span>
        </h1>
        <p className="text-neutral-900 mb-6 text-center font-semibold">
          Acceso WiFi para clientes
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              className="text-neutral-900 block font-bold mb-2 text-lg"
              htmlFor="username"
            >
              Usuario
            </label>
            <input
              className="w-full px-5 py-3 rounded-xl input-shadow-pink bg-inherit text-neutral-900 placeholder:text-[#bfae9e]"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Usuario"
            />
          </div>
          <div className="mb-6">
            <label
              className="text-neutral-900 block font-bold mb-2 text-lg"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              className="w-full px-5 py-3 rounded-xl input-shadow-yellow bg-inherit text-neutral-900 placeholder:text-[#bfae9e]"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Contraseña"
            />
          </div>
          {error && (
            <div className="mb-4 text-red-600 font-bold text-center bg-rose-100 rounded-lg py-2 px-4 border border-rose-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 mt-4 bg-gradient-to-r from-yellow-400 via-pink-300 to-orange-200 text-neutral-900 font-bold rounded-full shadow-lg text-lg transition button-shadow-hover hover:scale-105 hover:shadow-2xl"
          >
            Ingresar
          </button>
        </form>
      </div>
      <div className="mt-10 bone-text text-lg font-bold drop-shadow">
        &copy; 2025 SayCheese - Dulcería. Todos los derechos reservados.
      </div>
    </div>
  );
}
