export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', maxWidth: '800px', margin: '0 auto', color: '#1e293b' }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>⚡ Trueno 219 — Backend API</h1>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Servidor REST con Next.js App Router, Supabase PostgreSQL y TypeScript</p>
      </header>

      <section style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>Estado del Servidor</h2>
        <p>✅ Enrutador App Router activo</p>
        <p>✅ Conexión con Supabase PostgreSQL configurada</p>
        <p>✅ Endpoints REST listos para autenticación, inventario, ventas, clientes, deudas y migración</p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h3>Endpoints Principales</h3>
        <ul>
          <li><code>POST /api/auth/login</code> — Autenticación de usuarios</li>
          <li><code>GET /api/products</code> — Inventario de productos (tienda y bodega)</li>
          <li><code>POST /api/sales</code> — Registro de ventas transaccionales</li>
          <li><code>GET /api/debts</code> — Cartera y cuentas por cobrar</li>
          <li><code>GET /api/dashboard/summary</code> — Indicadores clave y métricas</li>
          <li><code>POST /api/migration/import</code> — Migración segura desde localStorage</li>
        </ul>
      </section>
    </main>
  );
}
