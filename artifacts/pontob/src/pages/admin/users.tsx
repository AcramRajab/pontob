import { useListUsers, useCreateUser, useUpdateUser, getListUsersQueryKey, getListFranchisesQueryKey, useListFranchises, UserInputRole, UserUpdateRole } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Plus } from "lucide-react";
import { useState } from "react";

const roleLabel: Record<string, string> = {
  master_admin: "Admin Master",
  staff_regional: "Equipe Regional",
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
};

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  franchiseId: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data: users = [], isLoading } = useListUsers({}, { query: { enabled: true, queryKey: getListUsersQueryKey({}) } });
  const { data: franchises = [] } = useListFranchises({ query: { enabled: true, queryKey: getListFranchisesQueryKey() } });
  const create = useCreateUser();
  const update = useUpdateUser();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UserForm>({
    defaultValues: { role: "responsavel_interno", franchiseId: "" },
  });

  const onSubmit = async (data: UserForm) => {
    try {
      const franchiseId = data.franchiseId ? parseInt(data.franchiseId) : undefined;
      if (editId) {
        const payload = {
          name: data.name,
          email: data.email,
          role: data.role as typeof UserUpdateRole[keyof typeof UserUpdateRole],
          franchiseId,
          ...(data.password ? { password: data.password } : {}),
        };
        await update.mutateAsync({ id: editId, data: payload });
        toast({ title: "Usuário atualizado" });
      } else {
        const payload = {
          name: data.name,
          email: data.email,
          role: data.role as typeof UserInputRole[keyof typeof UserInputRole],
          franchiseId,
          password: data.password,
        };
        await create.mutateAsync({ data: payload });
        toast({ title: "Usuário criado" });
      }
      qc.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
      setOpen(false);
      setEditId(null);
      reset();
    } catch {
      toast({ title: "Erro ao salvar usuário", variant: "destructive" });
    }
  };

  const handleEdit = (u: any) => {
    setEditId(u.id);
    reset({ name: u.name, email: u.email, role: u.role, franchiseId: u.franchiseId ? String(u.franchiseId) : "" });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gestão de usuários e permissões</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); reset(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-user">
              <Plus className="h-4 w-4 mr-1.5" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input {...register("name", { required: true })} data-testid="input-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" {...register("email", { required: true })} data-testid="input-email" />
              </div>
              {!editId && (
                <div className="space-y-1.5">
                  <Label>Senha *</Label>
                  <Input type="password" {...register("password", { required: !editId })} data-testid="input-password" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Perfil *</Label>
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabel).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Franquia</Label>
                <Controller
                  name="franchiseId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-franchise"><SelectValue placeholder="Sem franquia" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem franquia</SelectItem>
                        {franchises.map((f: any) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <Card key={u.id} data-testid={`card-user-${u.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {u.email}
                      {u.franchiseName && <span className="ml-2">— {u.franchiseName}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{roleLabel[u.role] || u.role}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(u)} data-testid={`button-edit-${u.id}`}>
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
