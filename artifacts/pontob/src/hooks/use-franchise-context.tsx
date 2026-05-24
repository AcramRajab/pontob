import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useListFranchises, getListFranchisesQueryKey } from "@workspace/api-client-react";

const SOCIO_KEY = "pontob_socio_franchise_id";
const ADMIN_KEY = "pontob_admin_franchise_id";

function readStorage(key: string): number | undefined {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) : undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, id: number | undefined) {
  try {
    if (id) localStorage.setItem(key, String(id));
    else localStorage.removeItem(key);
  } catch {}
}

export function useFranchiseContext() {
  const { user } = useAuth();
  const isAdmin = user?.role === "master_admin" || user?.role === "staff_regional";
  const isSocio = (user as any)?.role === "socio";

  const [adminFranchiseId, setAdminFranchiseIdRaw] = useState<number | undefined>(
    () => readStorage(ADMIN_KEY)
  );
  const [socioFranchiseId, setSocioFranchiseIdRaw] = useState<number | undefined>(
    () => readStorage(SOCIO_KEY)
  );

  const setAdminFranchiseId = (id: number | undefined) => {
    setAdminFranchiseIdRaw(id);
    writeStorage(ADMIN_KEY, id);
  };

  const setSocioFranchiseId = (id: number | undefined) => {
    setSocioFranchiseIdRaw(id);
    writeStorage(SOCIO_KEY, id);
  };

  const franchisesKey = getListFranchisesQueryKey();
  const { data: allFranchises = [] } = useListFranchises(
    { query: { enabled: isAdmin, queryKey: franchisesKey } }
  );

  const franchises = isAdmin
    ? [...allFranchises].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { sensitivity: "base" })
      )
    : isSocio
    ? ((user as any)?.linkedFranchises ?? []).slice().sort((a: any, b: any) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      )
    : [];

  // Auto-select when there is exactly one option and nothing stored yet
  useEffect(() => {
    if (isSocio && franchises.length === 1 && !socioFranchiseId) {
      setSocioFranchiseId((franchises[0] as any).id);
    }
    if (isAdmin && allFranchises.length === 1 && !adminFranchiseId) {
      setAdminFranchiseId((allFranchises[0] as any).id);
    }
  }, [isSocio, isAdmin, franchises.length, allFranchises.length, socioFranchiseId, adminFranchiseId]);

  const franchiseId = isAdmin
    ? adminFranchiseId
    : isSocio
    ? socioFranchiseId
    : (user?.franchiseId ?? undefined);

  return {
    franchiseId,
    isAdmin,
    isSocio,
    franchises,
    adminFranchiseId,
    setAdminFranchiseId,
    socioFranchiseId,
    setSocioFranchiseId,
  };
}
