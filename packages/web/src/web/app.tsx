import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute, AdminRoute } from "./components/protected-route";
import { Sidebar } from "./components/sidebar";
import LoginPage from "./pages/login";
import DashboardPage from "./pages/dashboard";
import VideosPage from "./pages/videos";
import ConteudosPage from "./pages/conteudos";
import NutricaoPage from "./pages/nutricao";
import AcessoPendentePage from "./pages/acesso-pendente";
import AdminPage from "./pages/admin";
import LojaPage from "./pages/loja";

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--cream)" }}>
      <Sidebar />
      <main className="flex-1 p-6 pb-24 pt-6 lg:pt-8 lg:pb-8 overflow-auto mt-14 lg:mt-0">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/loja" component={LojaPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/registar" component={LoginPage} />
        <Route path="/register" component={LoginPage} />
        <Route path="/acesso-pendente" component={AcessoPendentePage} />
        <Route path="/">
          <ProtectedRoute>
            <AppLayout><DashboardPage /></AppLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/videos">
          <ProtectedRoute>
            <AppLayout><VideosPage /></AppLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/conteudos">
          <ProtectedRoute>
            <AppLayout><ConteudosPage /></AppLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/nutricao">
          <ProtectedRoute>
            <AppLayout><NutricaoPage /></AppLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/admin">
          <AdminRoute>
            <AppLayout><AdminPage /></AppLayout>
          </AdminRoute>
        </Route>
        <Route>
          <ProtectedRoute>
            <AppLayout><DashboardPage /></AppLayout>
          </ProtectedRoute>
        </Route>
      </Switch>
    </QueryClientProvider>
  );
}
