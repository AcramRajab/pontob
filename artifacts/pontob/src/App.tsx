import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-provider";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Today from "@/pages/today";
import Dashboard from "@/pages/dashboard";
import Goals from "@/pages/goals/index";
import GoalDetail from "@/pages/goals/detail";
import GoalNew from "@/pages/goals/new";
import GoalEdit from "@/pages/goals/edit";
import KpisNew from "@/pages/goals/kpis-new";
import InitiativesNew from "@/pages/goals/initiatives-new";
import InitiativesEdit from "@/pages/goals/initiatives-edit";
import Initiatives from "@/pages/initiatives";
import DailyCheckin from "@/pages/checkin/daily";
import WeeklyCheckin from "@/pages/checkin/weekly";
import MonthlyCheckin from "@/pages/checkin/monthly";
import History from "@/pages/history";
import Alerts from "@/pages/alerts";
import Help from "@/pages/help";
import Catalog from "@/pages/catalog";
import Ranking from "@/pages/ranking";
import Regional from "@/pages/regional";
import RegionalFranchise from "@/pages/regional-franchise";
import AdminFranchises from "@/pages/admin/franchises";
import AdminUsers from "@/pages/admin/users";
import Settings from "@/pages/settings";
import MyTeam from "@/pages/my-team";
import Recrutamento from "@/pages/recrutamento/index";
import VagaNew from "@/pages/recrutamento/vagas-new";
import VagaDetail from "@/pages/recrutamento/vaga-detail";
import Secretaria from "@/pages/recrutamento/secretaria";
import Planner from "@/pages/planner";
import PlannerRegistro from "@/pages/planner-registro";
import PlannerHistorico from "@/pages/planner-historico";
import Visao from "@/pages/visao";
import AdminHistory from "@/pages/admin/history";
import Convite from "@/pages/convite";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 30,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/convite/:token" component={Convite} />
        <Route path="/login" component={Login} />
        <Route path="/today" component={Today} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/goals/new" component={GoalNew} />
        <Route path="/goals/:id/edit" component={GoalEdit} />
        <Route path="/goals/:id/kpis/new" component={KpisNew} />
        <Route path="/goals/:goalId/initiatives/:initiativeId/edit" component={InitiativesEdit} />
        <Route path="/goals/:id/initiatives/new" component={InitiativesNew} />
        <Route path="/goals/:id" component={GoalDetail} />
        <Route path="/goals" component={Goals} />
        <Route path="/initiatives" component={Initiatives} />
        <Route path="/checkin/daily" component={DailyCheckin} />
        <Route path="/checkin/weekly" component={WeeklyCheckin} />
        <Route path="/checkin/monthly" component={MonthlyCheckin} />
        <Route path="/history" component={History} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/help" component={Help} />
        <Route path="/catalog" component={Catalog} />
        <Route path="/ranking" component={Ranking} />
        <Route path="/regional/franchise/:id" component={RegionalFranchise} />
        <Route path="/regional" component={Regional} />
        <Route path="/admin/franchises" component={AdminFranchises} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/history" component={AdminHistory} />
        <Route path="/my-team" component={MyTeam} />
        <Route path="/settings" component={Settings} />
        <Route path="/recrutamento/secretaria" component={Secretaria} />
        <Route path="/recrutamento/vagas/new" component={VagaNew} />
        <Route path="/recrutamento/vagas/:id" component={VagaDetail} />
        <Route path="/recrutamento" component={Recrutamento} />
        <Route path="/planner/historico" component={PlannerHistorico} />
        <Route path="/planner/registro" component={PlannerRegistro} />
        <Route path="/planner" component={Planner} />
        <Route path="/visao" component={Visao} />
        <Route path="/" component={() => {
          window.location.replace("/today");
          return null;
        }} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
