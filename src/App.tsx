import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import IntersectObserver from "@/components/common/IntersectObserver";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/layouts/AppLayout";
import { routes } from "./routes";

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <IntersectObserver />
        <AppLayout>
          <Routes>
            {routes.map((route, index) => (
              <Route key={index} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
        <Toaster richColors position="top-right" />
      </Router>
    </ThemeProvider>
  );
};

export default App;
