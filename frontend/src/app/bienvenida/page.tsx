'use client';
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from 'next/image';

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
  const tiempo = params.get("tiempo") || "0";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-100 to-white">
      <div className="bg-white/90 rounded-xl shadow-xl p-8 max-w-md w-full text-center">
        <Image src="/globe.svg" alt="Logo" className="mx-auto mb-4" width={64} height={64} />
        <h2 className="text-2xl font-bold text-blue-600 mb-2">¡Bienvenido, {user}!</h2>
        <p className="text-gray-600 mb-4">Tu acceso WiFi ha sido concedido.</p>
        <div className="text-blue-700 font-bold text-lg mb-2">Tiempo disponible: {tiempo} horas</div>
      </div>
      <div className="mt-8 text-gray-400 text-sm">&copy; 2025 Dulcería Macam. Todos los derechos reservados.</div>
    </div>
  );
}
