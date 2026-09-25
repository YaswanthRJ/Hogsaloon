import { useAuthStore } from "../store/authStore";
import { logout } from "../services/auth.service";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }

  return (
    <header className="shrink-0 border-b border-hog-border bg-hog-surface">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight text-hog-text">
          Hogsaloon
        </h1>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-hog-pig">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-semibold text-hog-bg">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-medium text-hog-text-muted transition hover:bg-hog-surface-alt hover:text-hog-text"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}