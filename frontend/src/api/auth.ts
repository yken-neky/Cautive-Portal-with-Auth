import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  validateStatus: () => true,
});

export async function loginAuth(
  username: string,
  password: string,
  mac?: string
) {
  return api.post(
    "/login_auth",
    { username, password, mac },
    {
      transformRequest: [(data) => new URLSearchParams(data).toString()],
    }
  );
}

export async function logout(username: string) {
  return api.get(`/logout?username=${encodeURIComponent(username)}`);
}

export async function getTiempoRestante(username: string) {
  return api.get(`/get_tiempo_restante/${encodeURIComponent(username)}`);
}
