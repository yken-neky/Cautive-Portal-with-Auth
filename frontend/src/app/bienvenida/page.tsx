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
  const mac = params.get("mac") || (() => {
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/cautive\/([A-Fa-f0-9:-]{12,})\/login/);
      if (match && match[1]) return match[1];
    }
    return "";
  })();
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
      // Si el tiempo se acaba, cerrar sesión automáticamente
      handleLogout();
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

  // Llamar a mac_api?action=add al entrar a la página de bienvenida (solo una vez)
  useEffect(() => {
    if (!user || !mac) return;
    (async () => {
      try {
        const res = await fetch(`http://192.168.1.1:8080/cgi-bin/mac_api?action=add&mac=${encodeURIComponent(mac)}`);
        console.log("[mac_api:add] llamada realizada", res.status, await res.text());
      } catch (err) {
        console.log("[mac_api:add] error:", err);
      }
    })();
  }, [user, mac]);

  // Handler para cerrar sesión y desconectar
  const handleLogout = async () => {
    if (!user || !mac) return;
    (async () => {
      try {
        const res = await fetch(`http://192.168.1.1:8080/cgi-bin/mac_api?action=remove&mac=${encodeURIComponent(mac)}`);
        console.log("[mac_api:remove] llamada realizada", res.status, await res.text());
      } catch (err) {
        console.log("[mac_api:remove] error:", err);
      }
    })();
    // Logout normal
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
    <div className="min-h-screen flex flex-col justify-center items-center bg-transparent">
      <div className="bg-white/80 rounded-3xl shadow-2xl p-12 max-w-2xl w-full text-center border-none backdrop-blur-md form-float">
        <Image src="/globe.svg" alt="Logo" className="mx-auto mb-6" width={80} height={80} />
        <h2 className="text-3xl font-extrabold text-rose-600 mb-2 drop-shadow">¡Bienvenido, {user}!</h2>
        <p className="bone-text mb-4 font-semibold">Tu acceso WiFi ha sido concedido.</p>
        <div className="bone-text font-bold text-xl mb-2">
          {expirado ? (
            <span className="text-red-600">Tu tiempo ha expirado</span>
          ) : (
            <>Tiempo restante: <span className="bone-text">{formatTime(tiempoRestante)}</span></>
          )}
        </div>
        <button
          className="mt-6 bg-white/90 bone-text font-bold py-3 px-8 rounded-full shadow-lg transition text-lg button-shadow-hover"
          onClick={handleLogout}
        >
          Desconectar y salir
        </button>
      </div>
      <div className="mt-10 bone-text text-lg font-bold drop-shadow">&copy; 2025 SayCheese - Dulcería. Todos los derechos reservados.</div>
    </div>
  );
}
