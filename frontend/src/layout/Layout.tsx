import { Footer } from "./Footer";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";

export function Layout(){
    return (
        <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">
            <Outlet />
        </main>
        <Footer />
        </div>
    )
}