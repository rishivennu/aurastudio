import Subscribe from "./Subscribe";

/** Same footer on every page: credit, the Monday email, and the main links. */
export default function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <div>© {new Date().getFullYear()} aura.studio, crafted for people who notice.</div>
        <Subscribe compact />
        <div className="foot-links">
          <a href="/dashboard">Dashboard</a>
          <a href="/create">Create</a>
          <a href="/palettes">Palettes</a>
          <a href="/daily">Daily</a>
          <a href="/community">Community</a>
          <a href="/brand">Brand kit</a>
          <a href="https://vercel.com" target="_blank" rel="noreferrer">Vercel</a>
        </div>
      </div>
    </footer>
  );
}
