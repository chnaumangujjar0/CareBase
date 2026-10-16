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
    const token = localStorage.getItem("accessToken");
    if (hasDispatched.current || !token) {
      return;
    }

    hasDispatched.current = true;
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));
  const isReady = initialized || !hasToken;

  return { isReady, user };
}