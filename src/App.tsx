import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// GANTI KE HashRouter
import { HashRouter, Routes, Route } from "react-router-dom"; 
import Index from "./pages/Index";
import Schedule from "./pages/Schedule"; // Pastikan file Schedule.tsx sudah dibuat
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Gunakan HashRouter agar jalan di GAS */}
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/jadwal" element={<Schedule />} /> {/* Route Baru */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;