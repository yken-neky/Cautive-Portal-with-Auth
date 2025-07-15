"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { loginAuth } from "@/api/auth";

// Normaliza la MAC a formato AABBCCDDEEFF y luego valida
/* function normalizeMac(mac: string) {
  // Elimina espacios y convierte a mayúsculas
  let clean = mac.replace(/\s+/g, "").toUpperCase();
  // Elimina cualquier separador
  clean = clean.replace(/[-:]/g, "");
  return clean;
} */

function isValidMac(mac: string) {
  // Solo permite 12 caracteres hexadecimales (AABBCCDDEEFF), sin separadores
  return /^[0-9A-F]{12}$/.test(mac);
}

function formatMacForApi(mac: string) {
  // Convierte AABBCCDDEEFF a AA:BB:CC:DD:EE:FF
  return mac.match(/.{1,2}/g)?.join(":") ?? mac;
}

export default function CautiveLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mac, setMac] = useState("");
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    // Extraer la MAC de la ruta /cautive/:mac/login SIN normalizar separadores
    const macParam = typeof params.mac === "string" ? params.mac : Array.isArray(params.mac) ? params.mac[0] : "";
    setMac(macParam.toUpperCase());
  }, [params]);

  useEffect(() => {
    // Llamar a mac_api?action=add al entrar a la página de bienvenida (solo una vez)
    if (!mac || !isValidMac(mac)) return;
    (async () => {
      try {
        const macApi = formatMacForApi(mac);
        const res = await fetch(`http://192.168.1.1:8080/cgi-bin/mac_api?action=add&mac=${encodeURIComponent(macApi)}`);
        console.log("[mac_api:add] llamada realizada", res.status, await res.text());
      } catch (err) {
        console.log("[mac_api:add] error:", err);
      }
    })();
  }, [mac]);

  if (!isValidMac(mac)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-2xl font-bold text-red-700 text-center p-8">
          Dirección MAC inválida o no permitida.
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const macApi = formatMacForApi(mac);
      const res = await loginAuth(username, password, macApi);
      if (res.data.success) {
        router.push(
          `/bienvenida?user=${encodeURIComponent(res.data.user)}&tiempo=${res.data.tiempo}&mac=${encodeURIComponent(res.data.mac || macApi)}`
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
