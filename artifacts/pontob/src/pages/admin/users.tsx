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
import { Users, Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const roleLabel: Record<string, string> = {
  master_admin: "Admin Master",
  staff_regional: "Equipe Regional",
  franqueado: "Franqueado",
  responsavel_interno: "Responsável Interno",
};

const roleBadgeColor: Record<string, string> = {
  master_admin: "bg-red-100 text-red-700 border-red-200",
  staff_regional: "bg-orange-100 text-orange-700 border-orange-200",
  franqueado: "bg-blue-100 text-blue-700 border-blue-200",
  responsavel_interno: "bg-slate-100 text-slate-600 border-slate-200",
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
  const [showPass, setShowPass] = useState(false);

  const { data: users = [], isLoading } = useListUsers({}, { query: { enabled: true, queryKey: getListUsersQueryKey({}) } });
  const { data: franchises = [] } = useListFranchises({ query: { enabled: true, queryKey: getListFranchisesQueryKey() } });
  const create = useCreateUser();
  const update = useUpdateUser();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UserForm>({
    defaultValues: { role: "responsavel_interno", franchiseId: "none" },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setShowPass(false);
    reset({ role: "responsavel_interno", franchiseId: "none", name: "", email: "", password: "" });
  };

  const onSubmit = async (data: UserForm) => {
    try {
      const franchiseId = data.franchiseId && data.franchiseId !== "none" ? parseInt(data.franchiseId) : undefined;
      if (editId) {
        const payload: Record<string, unknown> = {
          name: data.name,
          email: data.email,
          role: data.role as typeof UserUpdateRole[keyof typeof UserUpdateRole],
          franchiseId,
        };
        if (data.password) payload.password = data.password;
        await update.mutateAsync({ id: editId, data: payload as Parameters<typeof update.mutateAsync>[0]["data"] });
        toast({ title: "Usuário atualizado com sucesso" });
      } else {
        await create.mutateAsync({
          data: {
            name: data.name,
            email: data.email,
            role: data.role as typeof UserInputRole[keyof typeof UserInputRole],
            franchiseId,
            password: data.password,
          },
        });
        toast({ title: "Usuário criado com sucesso" });
      }
      qc.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
      closeDialog();
    } catch {
      toast({ title: "Erro ao salvar usuário", variant: "destructive" });
    }
  };

  const handleEdit = (u: any) => {
    setEditId(u.id);
    setShowPass(false);
    reset({
      name: u.name,
      email: u.email,
      role: u.role,
      franchiseId: u.franchiseId ? String(u.franchiseId) : "none",
      password: "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gestão de usuários e permissões</p>
        </div>
        <Dialog open={open} onOpenChange={v => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-user" onClick={() => { reset({ role: "responsavel_interno", franchiseId: "none" }); setEditId(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-1">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input
                  {...register("name", { required: "Campo obrigatório" })}
                  placeholder="Ex: João Silva"
                  data-testid="input-name"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  {...register("email", { required: "Campo obrigatório" })}
                  placeholder="joao@exemplo.com.br"
                  data-testid="input-email"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <Label>{editId ? "Nova Senha" : "Senha *"}</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    {...register("password", {
                      required: editId ? false : "Campo obrigatório",
                      minLength: { value: 6, message: "Mínimo 6 caracteres" },
                    })}
                    placeholder={editId ? "Deixe em branco para manter a atual" : "Mínimo 6 caracteres"}
                    data-testid="input-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                {editId && (
                  <p className="text-xs text-muted-foreground">Preencha somente se quiser redefinir a senha deste usuário.</p>
                )}
              </div>

              {/* Perfil */}
              <div className="space-y-1.5">
                <Label>Perfil *</Label>
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabel).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && <p className="text-xs text-destructive">Campo obrigatório</p>}
              </div>

              {/* Franquia */}
              <div className="space-y-1.5">
                <Label>Franquia</Label>
                <Controller
                  name="franchiseId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-franchise">
                        <SelectValue placeholder="Sem franquia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem franquia</SelectItem>
                        {franchises.map((f: any) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" type="button" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" disabled={create.isPending || update.isPending} data-testid="button-save">
                  {create.isPending || update.isPending ? "Salvando..." : editId ? "Salvar alterações" : "Criar usuário"}
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
            <p className="font-medium">Nenhum usuário cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Novo Usuário" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <Card key={u.id} data-testid={`card-user-${u.id}`} className={!u.active ? "opacity-50" : ""}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                        {u.franchiseName && <span className="ml-2 text-muted-foreground/70">— {u.franchiseName}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs border ${roleBadgeColor[u.role] || ""}`} variant="outline">
                      {roleLabel[u.role] || u.role}
                    </Badge>
                    {!u.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(u)} data-testid={`button-edit-${u.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
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
