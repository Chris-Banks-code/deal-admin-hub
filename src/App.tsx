import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Analytics from "./pages/Analytics";
import UsersPage from "./pages/Users";
import ProductsPage from "./pages/Products";
import ClientsPage from "./pages/Clients";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import TargetsPage from "./pages/Targets";
import ComingSoon from "./pages/ComingSoon";
import AgentsPage from "./pages/Agents";
import { MODULES } from "./lib/erp-modules";

const queryClient = new QueryClient();

// Modules that already have a real page — everything else routes to ComingSoon.
const REAL_ROUTES: Record<string, boolean> = {
  '/dashboard': true,
  '/orders': true,
  '/analytics': true,
  '/products': true,
  '/customers': true, // Clients page reused as Customers
  '/agents': true,
  '/sales': true,
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Real pages */}
            <Route path="/dashboard" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute module="orders"><Orders /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute module="analytics"><Analytics /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute module="products"><ProductsPage /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute module="customers"><ClientsPage /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute module="agents"><AgentsPage /></ProtectedRoute>} />
            {/* Legacy alias */}
            <Route path="/clients" element={<Navigate to="/customers" replace />} />


            {/* Users / Targets (legacy admin pages, kept accessible) */}
            <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
            <Route path="/targets" element={<ProtectedRoute><TargetsPage /></ProtectedRoute>} />

            {/* Stubbed modules — auto-registered from the module registry */}
            {MODULES.filter(m => !REAL_ROUTES[m.url]).map(m => (
              <Route
                key={m.url}
                path={m.url}
                element={
                  <ProtectedRoute module={m.key}>
                    <ComingSoon title={m.title} description={m.description} features={m.features} />
                  </ProtectedRoute>
                }
              />
            ))}

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
