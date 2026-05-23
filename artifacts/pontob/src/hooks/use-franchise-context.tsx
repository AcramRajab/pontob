import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListFranchises, getListFranchisesQueryKey } from "@workspace/api-client-react";

export function useFranchiseContext() {
  const { user } = useAuth();
  const isAdmin = user?.role === "master_admin" || user?.role === "staff_regional";
  const isSocio = user?.role === "socio";
  const [adminFranchiseId, setAdminFranchiseId] = useState<number | undefined>();
  const [socioFranchiseId, setSocioFranchiseId] = useState<number | undefined>();

  // socio: picks from their linked franchises (no DB fetch needed — already in user object)
  // admin/staff: picks from all franchises (fetched from API)
  // franqueado/responsavel: fixed to their single franchise
  const franchiseId = isAdmin
    ? adminFranchiseId
    : isSocio
    ? socioFranchiseId
    : (user?.franchiseId ?? undefined);

  const franchisesKey = getListFranchisesQueryKey();
  const { data: allFranchises = [] } = useListFranchises(
    { query: { enabled: isAdmin, queryKey: franchisesKey } }
  );

  // For admins: all franchises sorted alphabetically. For socio: their linked list.
  const franchises = isAdmin
    ? [...allFranchises].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", { sensitivity: "base" })
      )
    : isSocio
    ? (user?.linkedFranchises ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      )
    : [];

  return {
    franchiseId,
    isAdmin,
    isSocio,
    franchises,
    // admin uses these
    adminFranchiseId,
    setAdminFranchiseId,
    // socio uses these
    socioFranchiseId,
    setSocioFranchiseId,
  };
}
