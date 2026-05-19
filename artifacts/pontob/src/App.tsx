import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-provider";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
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

function RootRedirect() {
  window.location.replace("/today");
  return null;
}

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
        <Route path="/today">
          <ProtectedRoute><Today /></ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        <Route path="/goals/new">
          <ProtectedRoute><GoalNew /></ProtectedRoute>
        </Route>
        <Route path="/goals/:id/edit">
          {() => <ProtectedRoute><GoalEdit /></ProtectedRoute>}
        </Route>
        <Route path="/goals/:id/kpis/new">
          {() => <ProtectedRoute><KpisNew /></ProtectedRoute>}
        </Route>
        <Route path="/goals/:goalId/initiatives/:initiativeId/edit">
          {() => <ProtectedRoute><InitiativesEdit /></ProtectedRoute>}
        </Route>
        <Route path="/goals/:id/initiatives/new">
          {() => <ProtectedRoute><InitiativesNew /></ProtectedRoute>}
        </Route>
        <Route path="/goals/:id">
          {() => <ProtectedRoute><GoalDetail /></ProtectedRoute>}
        </Route>
        <Route path="/goals">
          <ProtectedRoute><Goals /></ProtectedRoute>
        </Route>
        <Route path="/initiatives">
          <ProtectedRoute><Initiatives /></ProtectedRoute>
        </Route>
        <Route path="/checkin/daily">
          <ProtectedRoute><DailyCheckin /></ProtectedRoute>
        </Route>
        <Route path="/checkin/weekly">
          <ProtectedRoute><WeeklyCheckin /></ProtectedRoute>
        </Route>
        <Route path="/checkin/monthly">
          <ProtectedRoute><MonthlyCheckin /></ProtectedRoute>
        </Route>
        <Route path="/history">
          <ProtectedRoute><History /></ProtectedRoute>
        </Route>
        <Route path="/alerts">
          <ProtectedRoute><Alerts /></ProtectedRoute>
        </Route>
        <Route path="/help">
          <ProtectedRoute><Help /></ProtectedRoute>
        </Route>
        <Route path="/catalog">
          <ProtectedRoute><Catalog /></ProtectedRoute>
        </Route>
        <Route path="/ranking">
          <ProtectedRoute><Ranking /></ProtectedRoute>
        </Route>
        <Route path="/regional/franchise/:id">
          {() => <ProtectedRoute><RegionalFranchise /></ProtectedRoute>}
        </Route>
        <Route path="/regional">
          <ProtectedRoute><Regional /></ProtectedRoute>
        </Route>
        <Route path="/admin/franchises">
          <ProtectedRoute><AdminFranchises /></ProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute><AdminUsers /></ProtectedRoute>
        </Route>
        <Route path="/admin/history">
          <ProtectedRoute><AdminHistory /></ProtectedRoute>
        </Route>
        <Route path="/my-team">
          <ProtectedRoute><MyTeam /></ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute><Settings /></ProtectedRoute>
        </Route>
        <Route path="/recrutamento/secretaria">
          <ProtectedRoute><Secretaria /></ProtectedRoute>
        </Route>
        <Route path="/recrutamento/vagas/new">
          <ProtectedRoute><VagaNew /></ProtectedRoute>
        </Route>
        <Route path="/recrutamento/vagas/:id">
          {() => <ProtectedRoute><VagaDetail /></ProtectedRoute>}
        </Route>
        <Route path="/recrutamento">
          <ProtectedRoute><Recrutamento /></ProtectedRoute>
        </Route>
        <Route path="/planner/historico">
          <ProtectedRoute><PlannerHistorico /></ProtectedRoute>
        </Route>
        <Route path="/planner/registro">
          <ProtectedRoute><PlannerRegistro /></ProtectedRoute>
        </Route>
        <Route path="/planner">
          <ProtectedRoute><Planner /></ProtectedRoute>
        </Route>
        <Route path="/visao">
          <ProtectedRoute><Visao /></ProtectedRoute>
        </Route>
        <Route path="/">
          <ProtectedRoute><RootRedirect /></ProtectedRoute>
        </Route>
        <Route>
          <ProtectedRoute><NotFound /></ProtectedRoute>
        </Route>
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
