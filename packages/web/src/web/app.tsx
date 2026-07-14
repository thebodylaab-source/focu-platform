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
import PrivacidadePage from "./pages/privacidade";
import ReporPasswordPage from "./pages/repor-password";
import CicloPage from "./pages/ciclo";
import MensalidadePage from "./pages/mensalidade";
import ChatPage from "./pages/chat";

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--cream)" }}>
      <Sidebar />
      <main className="flex-1 p-6 pb-8 pt-6 lg:pt-8 overflow-auto mt-14 lg:mt-0">
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
        <Route path="/privacidade" component={PrivacidadePage} />
        <Route path="/repor-password" component={ReporPasswordPage} />
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
        <Route path="/ciclo">
          <ProtectedRoute>
            <AppLayout><CicloPage /></AppLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/mensalidade">
          <ProtectedRoute>
            <AppLayout><MensalidadePage /></AppLayout>
          </ProtectedRoute>
        </Route>
        <Route path="/chat">
          <ProtectedRoute>
            <AppLayout><ChatPage /></AppLayout>
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
