import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "./store";
import { fetchTenantById, selectCurrentTenant, selectTenantInitialized } from "./tenantSlice";
import { selectCurrentUser } from "./authSlice";

export function useTenantBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectCurrentUser);
  const tenant = useSelector(selectCurrentTenant);
  const initialized = useSelector(selectTenantInitialized);
  const hasDispatched = useRef(false);

  useEffect(() => {
    if (hasDispatched.current || initialized) return;
    if (!user?.tenantId) return;

    hasDispatched.current = true;
    dispatch(fetchTenantById(user.tenantId));
  }, [dispatch, user, initialized]);

  const isReady = initialized || !user?.tenantId;

  return { isReady, tenant };
}