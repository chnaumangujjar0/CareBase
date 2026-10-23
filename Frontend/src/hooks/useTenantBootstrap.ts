import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../store/store";
import {
  clearTenant,
  fetchTenantById,
  selectCurrentTenant,
  selectTenantInitialized,
  selectTenantLoading,
  selectRequestedTenantId,
} from "../store/tenantSlice";
import { selectCurrentUser } from "../store/authSlice";

export function useTenantBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector(selectCurrentUser);
  const tenant = useSelector(selectCurrentTenant);
  const initialized = useSelector(selectTenantInitialized);
  const loading = useSelector(selectTenantLoading);
  const requestedTenantId = useSelector(selectRequestedTenantId);

  useEffect(() => {
    const tenantId = user?.tenantId;
    if (!tenantId) {
      if (tenant || loading || !initialized || requestedTenantId) dispatch(clearTenant());
      return;
    }

    if (tenant?.id === tenantId && initialized) {
      return;
    }
    if (loading || requestedTenantId === tenantId) return;

    dispatch(fetchTenantById(tenantId));
  }, [dispatch, initialized, loading, requestedTenantId, tenant, user?.tenantId]);

  const isReady = !user?.tenantId || (
    initialized &&
    !loading &&
    (tenant?.id === user.tenantId || requestedTenantId === user.tenantId)
  );

  return { isReady, tenant };
}
