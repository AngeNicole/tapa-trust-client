// Page frame for signed-in areas: a soft gray page with a floating white
// app card. The DashShell (sidebar + top bar + content) renders inside it.
export default function Layout({ children }) {
  return (
    <div className="page-bg">
      <div className="app-shell">{children}</div>
    </div>
  );
}
