// ============================================================
// App — router + palette wiring
// ============================================================

function App() {
  const [route, setRoute] = React.useState(() => {
    try { return localStorage.getItem('nc:route') || '/'; } catch { return '/'; }
  });
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    try { localStorage.setItem('nc:route', route); } catch {}
  }, [route]);

  // ⌘K / Ctrl+K
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Route parse: /markets/:id
  let page;
  if (route === '/')                    page = <LandingPage setRoute={setRoute}/>;
  else if (route === '/markets')        page = <MarketsPage setRoute={setRoute}/>;
  else if (route.startsWith('/markets/')) page = <MarketDetailPage marketId={route.split('/')[2]} setRoute={setRoute}/>;
  else if (route === '/portfolio')      page = <PortfolioPage setRoute={setRoute}/>;
  else if (route === '/vaults')         page = <VaultsPage/>;
  else if (route === '/score')          page = <ScorePage/>;
  else if (route === '/liquidity')      page = <LiquidityPage setRoute={setRoute}/>;
  else                                  page = <LandingPage setRoute={setRoute}/>;

  return (
    <>
      <Shell route={route} setRoute={setRoute} onOpenPalette={() => setPaletteOpen(true)}>
        <div key={route}>{page}</div>
      </Shell>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(id) => setRoute(id)}
      />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
