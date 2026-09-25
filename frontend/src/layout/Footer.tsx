export function Footer() {
  return (
    <footer className="border-t border-hog-border px-6 py-4">
      <p className="text-center text-xs text-hog-text-muted">
        © {new Date().getFullYear()} Hogsaloon
      </p>
    </footer>
  );
}