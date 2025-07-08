'use client';
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from 'next/image';
import { logout, getTiempoRestante } from "@/api/auth";
import { useRouter } from "next/navigation";

export default function Bienvenida() {
  return (
    <Suspense>
      <BienvenidaContent />
    </Suspense>
  );
}

function BienvenidaContent() {
  const params = useSearchParams();
  const user = params.get("user") || "";
  // El tiempo inicial es null, se obtiene del backend
  const [tiempoRestante, setTiempoRestante] = useState<number | null>(null);
  const [expirado, setExpirado] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  // Al montar, obtener el tiempo real desde el backend
  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await getTiempoRestante(user);
        if (res.data && res.data.success && !cancelado && typeof res.data.tiempo === 'number') {
          setTiempoRestante(Number(res.data.tiempo));
        }
      } catch (e) {
        console.error("Error al obtener el tiempo restante:", e);
      }
    })();
    return () => { cancelado = true; };
  }, [user]);

  // Cuenta regresiva
  useEffect(() => {
    if (tiempoRestante === null) return;
    if (tiempoRestante <= 0) {
      setExpirado(true);
      return;
    }
    const interval = setInterval(() => {
      setTiempoRestante((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tiempoRestante]);

  // WebSocket para actualizar tiempo cada 5 segundos
  useEffect(() => {
    if (!user || tiempoRestante === null) return;
    const ws = new WebSocket(
      `ws://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8080/ws/update_time?username=${encodeURIComponent(user)}`
    );
    wsRef.current = ws;
    let interval: NodeJS.Timeout;
    ws.onopen = () => {
      if (ws.readyState === 1 && tiempoRestante > 0) {
        const payload = { username: user, tiempo: tiempoRestante };
        ws.send(JSON.stringify(payload));
      }
      interval = setInterval(() => {
        if (ws.readyState === 1 && tiempoRestante > 0) {
          const payload = { username: user, tiempo: tiempoRestante };
          ws.send(JSON.stringify(payload));
        }
      }, 5000);
    };
    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 1001) {
        console.log("[WS] Desconectado con error:", e);
      }
      clearInterval(interval);
    };
    ws.onerror = (e) => {
      console.log("[WS] Error:", e);
      clearInterval(interval);
    };
    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [user, tiempoRestante]);

  // Handler para cerrar sesión y desconectar
  const handleLogout = async () => {
    if (!user) return;
    try {
      await logout(user);
    } catch (e) {
      console.log(e);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    alert("Desconectado con éxito, gracias por usar nuestros servicios");
    router.push("/"); // Redirige al portal cautivo
  };

  // Formato HH:MM:SS
  function formatTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (tiempoRestante === null) {
    return <div className="min-h-screen flex items-center justify-center">Cargando tiempo real...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-white">
      <div className="bg-white/90 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        <Image src="/globe.svg" alt="Logo" className="mx-auto mb-4" width={64} height={64} />
        <h2 className="text-2xl font-bold text-blue-600 mb-2">¡Bienvenido, {user}!</h2>
        <p className="text-gray-600 mb-4">Tu acceso WiFi ha sido concedido.</p>
        <div className="text-blue-700 font-bold text-lg mb-2">
          {expirado ? (
            <span className="text-red-600">Tu tiempo ha expirado</span>
          ) : (
            <>Tiempo restante: {formatTime(tiempoRestante)}</>
          )}
        </div>
        <button
          className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition"
          onClick={handleLogout}
        >
          Desconectar y salir
        </button>
      </div>
      <div className="mt-8 text-gray-400 text-sm">&copy; 2025 Dulcería Macam. Todos los derechos reservados.</div>
    </div>
  );
}
