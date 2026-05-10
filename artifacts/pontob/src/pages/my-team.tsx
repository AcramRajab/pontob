import { useAuth } from "@/lib/auth";
import { useListUsers, useCreateUser, useUpdateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Plus, ShieldOff } from "lucide-react";
import { useState } from "react";

interface UserForm {
  name: string;
  email: string;
  password: string;
}

export default function MyTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const queryKey = getListUsersQueryKey({});
  const { data: users = [], isLoading } = useListUsers({}, { query: { enabled: true, queryKey } });
  const create = useCreateUser();
  const update = useUpdateUser();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>();

  const myFranchiseId = user?.franchiseId;

  const onSubmit = async (data: UserForm) => {
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, data: { name: data.name, email: data.email, ...(data.password ? { password: data.password } : {}) } });
        toast({ title: "Usuário atualizado com sucesso" });
      } else {
        await create.mutateAsync({
          data: {
            name: data.name,
            email: data.email,
            password: data.password,
            role: "responsavel_interno" as const,
            franchiseId: myFranchiseId ?? undefined,
          },
        });
        toast({ title: "Usuário criado com sucesso" });
      }
      qc.invalidateQueries({ queryKey });
      setOpen(false);
      setEditId(null);
      reset();
    } catch {
      toast({ title: "Erro ao salvar usuário", variant: "destructive" });
    }
  };

  const handleEdit = (u: any) => {
    setEditId(u.id);
    reset({ name: u.name, email: u.email, password: "" });
    setOpen(true);
  };

  const handleToggleActive = async (u: any) => {
    try {
      await update.mutateAsync({ id: u.id, data: { active: !u.active } });
      toast({ title: u.active ? "Usuário desativado" : "Usuário reativado" });
      qc.invalidateQueries({ queryKey });
    } catch {
      toast({ title: "Erro ao atualizar usuário", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie os usuários com acesso à sua franquia</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); reset(); } }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground mb-2 p-3 bg-muted rounded-md">
              Usuários criados aqui têm acesso de <strong>somente leitura</strong> à sua franquia.
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input {...register("name", { required: true })} placeholder="Nome completo" />
                {errors.name && <p className="text-xs text-destructive">Campo obrigatório</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" {...register("email", { required: true })} placeholder="email@exemplo.com" />
                {errors.email && <p className="text-xs text-destructive">Campo obrigatório</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{editId ? "Nova Senha (deixe vazio para manter)" : "Senha *"}</Label>
                <Input
                  type="password"
                  {...register("password", { required: !editId })}
                  placeholder={editId ? "Deixe vazio para não alterar" : "Mínimo 6 caracteres"}
                />
                {errors.password && <p className="text-xs text-destructive">Campo obrigatório</p>}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {create.isPending || update.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">Nenhum usuário cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie usuários para dar acesso de leitura à sua franquia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <Card key={u.id} className={!u.active ? "opacity-60" : ""}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {u.role === "franqueado" ? "Franqueado (você)" : "Responsável Interno"}
                    </Badge>
                    {u.id !== user?.id && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(u)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={u.active ? "text-destructive hover:text-destructive" : "text-muted-foreground"}
                          onClick={() => handleToggleActive(u)}
                          title={u.active ? "Desativar acesso" : "Reativar acesso"}
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
