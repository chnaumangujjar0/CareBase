import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "./store";
import {
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
    if (hasDispatched.current || initialized) return;

    const token = localStorage.getItem("accessToken");
    if (!token) {
      return;
    }

    hasDispatched.current = true;
    dispatch(fetchCurrentUser());
  }, [dispatch, initialized]);

  const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));
  const isReady = initialized || !hasToken;

  return { isReady, user };
}