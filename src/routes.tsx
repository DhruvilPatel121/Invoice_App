import type { ReactNode } from "react";
import Dashboard from "./pages/Dashboard";
import InvoiceList from "./pages/InvoiceList";
import InvoiceForm from "./pages/InvoiceForm";
import ViewInvoice from "./pages/ViewInvoice";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: "Dashboard", path: "/", element: <Dashboard />, public: true },
  {
    name: "Invoices",
    path: "/invoices",
    element: <InvoiceList />,
    public: true,
  },
  {
    name: "Create Invoice",
    path: "/invoices/create",
    element: <InvoiceForm />,
    public: true,
  },
  {
    name: "Edit Invoice",
    path: "/invoices/:id/edit",
    element: <InvoiceForm />,
    public: true,
  },
  {
    name: "View Invoice",
    path: "/invoices/:id",
    element: <ViewInvoice />,
    public: true,
  },
  { name: "Clients", path: "/clients", element: <Clients />, public: true },
  { name: "Reports", path: "/reports", element: <Reports />, public: true },
  { name: "Settings", path: "/settings", element: <Settings />, public: true },
];
