import { Link } from 'react-router';
import '../products/skinfolio/skinfolio.css';

export function NotFound() {
  return (
    <main id="main-content" className="app" tabIndex={-1}>
      <section className="notice" role="alert">
        <strong>Esta página no existe.</strong> Vuelve a la colección desde{' '}
        <Link to="/">Skinfolio</Link>.
      </section>
    </main>
  );
}
