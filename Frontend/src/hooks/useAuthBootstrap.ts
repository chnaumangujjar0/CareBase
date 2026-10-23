import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../store/store";
import {
  clearUser,
  fetchCurrentUser,
  selectAuthInitialized,
  selectCurrentUser,
} from "../store/authSlice";

const hasStoredSession = (): boolean => {
  try {
    return Boolean(localStorage.getItem("accessToken") || localStorage.getItem("refreshToken"));
  } catch {
    return false;
  }
};

export function useAuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const initialized = useSelector(selectAuthInitialized);
  const user = useSelector(selectCurrentUser);

  useEffect(() => {
    if (initialized) return;

    if (hasStoredSession()) {
      dispatch(fetchCurrentUser());
    } else {
      dispatch(clearUser());
    }
  }, [dispatch, initialized]);

  return { isReady: initialized, user };
}
