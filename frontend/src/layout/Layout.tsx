import { Footer } from "./Footer";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}