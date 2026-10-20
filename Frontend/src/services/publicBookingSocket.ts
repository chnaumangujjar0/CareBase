export interface PublicBookingSocket {
  connect(): void;
  disconnect(): void;
  emit(event: string, payload: unknown): void;
  on(event: string, listener: (payload: { doctorId: string }) => void): void;
  off(event: string, listener: (payload: { doctorId: string }) => void): void;
}

declare global {
  interface Window {
    io?: (url?: string, options?: { autoConnect?: boolean }) => PublicBookingSocket;
  }
}

let loadingClient: Promise<void> | null = null;

const socketOrigin = () => {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!apiUrl) return window.location.origin;
  const url = new URL(apiUrl, window.location.origin);
  url.pathname = url.pathname.replace(/\/api\/v\d+\/?$/, "") || "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};

export const createPublicBookingSocket = async () => {
  if (!window.io) {
    loadingClient ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${socketOrigin()}/socket.io/socket.io.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadingClient = null;
        reject(new Error("Could not load live appointment updates"));
      };
      document.head.appendChild(script);
    });
    await loadingClient;
  }
  if (!window.io) throw new Error("Live appointment updates are unavailable");
  return window.io(socketOrigin(), { autoConnect: false });
};
