import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListFranchises, getListFranchisesQueryKey } from "@workspace/api-client-react";

export function useFranchiseContext() {
  const { user } = useAuth();
  const isAdmin = user?.role === "master_admin" || user?.role === "staff_regional";
  const [adminFranchiseId, setAdminFranchiseId] = useState<number | undefined>();

  const franchiseId = isAdmin ? adminFranchiseId : (user?.franchiseId ?? undefined);

  const franchisesKey = getListFranchisesQueryKey();
  const { data: franchises = [] } = useListFranchises(
    { query: { enabled: isAdmin, queryKey: franchisesKey } }
  );

  return { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId };
}
