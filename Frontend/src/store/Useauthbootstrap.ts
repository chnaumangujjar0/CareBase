import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "./store";
import {
  clearUser,
  fetchCurrentUser,
  selectAuthInitialized,
  selectCurrentUser,
} from "./authSlice";

export function useAuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const initialized = useSelector(selectAuthInitialized);
  const user = useSelector(selectCurrentUser);
  const hasDispatched = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    if (hasDispatched.current) {
      return;
    }

    hasDispatched.current = true;
    if (token || refreshToken) {
      dispatch(fetchCurrentUser());
    } else {
      dispatch(clearUser());
    }
  }, [dispatch]);

  const hasStoredSession = typeof window !== "undefined" && Boolean(
    localStorage.getItem("accessToken") || localStorage.getItem("refreshToken"),
  );
  const isReady = initialized || !hasStoredSession;

  return { isReady, user };
}
