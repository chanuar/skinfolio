export function Loading() {
  return (
    <div className="app">
      <a className="skinfolio-skip" href="#main-content">
        Saltar al contenido
      </a>
      <main id="main-content" className="loading" tabIndex={-1}>
        <p className="header__tag">League of Legends · Colección personal</p>
        <h1>Skinfolio</h1>
        <p>Skins, chromas y progreso de la colección en un solo lugar.</p>
        <p role="status">Cargando catálogo y colección…</p>
      </main>
    </div>
  );
}
