import { useListFranchises, useCreateFranchise, useUpdateFranchise, getListFranchisesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Building2, Plus, Trash2, Phone, Mail, Hash } from "lucide-react";
import { useState } from "react";

interface FranchiseForm {
  name: string;
  city: string;
  state: string;
  brokerOwnerName: string;
  contactEmail: string;
  phone: string;
  cnpj: string;
}

export default function AdminFranchises() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: franchises = [], isLoading } = useListFranchises({ query: { enabled: true, queryKey: getListFranchisesQueryKey() } });
  const create = useCreateFranchise();
  const update = useUpdateFranchise();

  const deleteFranchise = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/franchises/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao excluir franquia");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListFranchisesQueryKey() });
      toast({ title: "Franquia excluída com sucesso" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FranchiseForm>();

  const onSubmit = async (data: FranchiseForm) => {
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, data });
        toast({ title: "Franquia atualizada" });
      } else {
        await create.mutateAsync({ data });
        toast({ title: "Franquia criada" });
      }
      qc.invalidateQueries({ queryKey: getListFranchisesQueryKey() });
      setOpen(false);
      setEditId(null);
      reset();
    } catch {
      toast({ title: "Erro ao salvar franquia", variant: "destructive" });
    }
  };

  const handleEdit = (f: any) => {
    setEditId(f.id);
    reset({
      name: f.name,
      city: f.city,
      state: f.state,
      brokerOwnerName: f.brokerOwnerName || "",
      contactEmail: f.contactEmail || "",
      phone: f.phone || "",
      cnpj: f.cnpj || "",
    });
    setOpen(true);
  };

  const filtered = franchises.filter((f: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.city?.toLowerCase().includes(q) ||
      f.brokerOwnerName?.toLowerCase().includes(q) ||
      f.contactEmail?.toLowerCase().includes(q) ||
      f.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Franquias</h1>
          <p className="text-muted-foreground mt-1">
            {franchises.length} franquia{franchises.length !== 1 ? "s" : ""} RE/MAX SC cadastradas
          </p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); reset(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-franchise">
              <Plus className="h-4 w-4 mr-1.5" /> Nova Franquia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Franquia" : "Nova Franquia"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input {...register("name", { required: true })} data-testid="input-name" />
                {errors.name && <p className="text-xs text-destructive">Nome obrigatório</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cidade *</Label>
                  <Input {...register("city", { required: true })} data-testid="input-city" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado *</Label>
                  <Input {...register("state", { required: true })} placeholder="SC" data-testid="input-state" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Broker Owner (Franqueado)</Label>
                <Input {...register("brokerOwnerName")} data-testid="input-broker-owner" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>E-mail de contato</Label>
                  <Input type="email" {...register("contactEmail")} placeholder="nome@remax.com.br" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone / WhatsApp</Label>
                  <Input {...register("phone")} placeholder="47 99999-0000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input {...register("cnpj")} placeholder="00.000.000/0001-00" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={create.isPending || update.isPending} data-testid="button-save">
                  {create.isPending || update.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Buscar por nome, cidade, franqueado ou e-mail…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhuma franquia encontrada para essa busca." : "Nenhuma franquia cadastrada."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((f: any) => (
            <Card key={f.id} data-testid={`card-franchise-${f.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{f.name}</p>
                      <Badge variant="outline" className={f.active ? "bg-green-50 text-green-700 border-green-200 text-xs" : "bg-red-50 text-red-600 border-red-200 text-xs"}>
                        {f.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.city}, {f.state}
                      {f.brokerOwnerName && <span className="ml-2 font-medium text-foreground/70">— {f.brokerOwnerName}</span>}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {f.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {f.phone}
                        </span>
                      )}
                      {f.contactEmail && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {f.contactEmail}
                        </span>
                      )}
                      {f.cnpj && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {f.cnpj}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(f)} data-testid={`button-edit-${f.id}`}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget({ id: f.id, name: f.name })}
                      data-testid={`button-delete-${f.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir franquia?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
              Só é possível excluir franquias sem usuários vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteFranchise.mutate(deleteTarget.id)}
              disabled={deleteFranchise.isPending}
            >
              {deleteFranchise.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
