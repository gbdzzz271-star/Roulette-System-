// ROULETTE SYSTEM — Analytics de visitas
(() => {
  const URL = window.ROULETTE_SUPABASE_URL;
  const KEY = window.ROULETTE_SUPABASE_PUBLISHABLE_KEY;

  if (!URL || !KEY || !window.supabase?.createClient) {
    console.warn("RS Analytics: configuração pública do Supabase não encontrada.");
    return;
  }

  const client = window.supabase.createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  const STORAGE_KEY = "rs_analytics_visitor_v1";
  let visitorId = localStorage.getItem(STORAGE_KEY);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }

  async function ping() {
    try {
      const { error } = await client.from("rs_visits").insert({
        visitor_id: visitorId
      });
      if (error) console.warn("RS Analytics:", error.message);
    } catch (error) {
      console.warn("RS Analytics:", error?.message || error);
    }
  }

  ping();
  setInterval(() => {
    if (document.visibilityState === "visible") ping();
  }, 60_000);

  function addOperatorDashboard() {
    const operatorPanel = document.getElementById("operatorPanel");
    if (!operatorPanel || document.getElementById("rsAnalyticsPanel")) return;

    const section = document.createElement("section");
    section.id = "rsAnalyticsPanel";
    section.className = "panel";
    section.style.cssText =
      "margin-top:22px;padding:18px;border:1px solid #8d63c7;border-radius:16px;background:rgba(18,12,29,.92)";

    section.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <small style="color:#c6a5ef;letter-spacing:2px">PAINEL PRIVADO</small>
          <h3 style="margin:5px 0 0;color:#fff">Estatísticas de acesso</h3>
        </div>
        <button id="rsAnalyticsRefresh" class="subtle" type="button">↻ Atualizar</button>
      </div>
      <p id="rsAnalyticsStatus" class="muted">Aguardando acesso de operador…</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px">
        <div style="padding:14px;border-radius:12px;background:#241832">
          <small>Visitantes únicos</small>
          <div id="rsUnique" style="font-size:28px;font-weight:800;color:#f0d18b">—</div>
        </div>
        <div style="padding:14px;border-radius:12px;background:#241832">
          <small>Online agora*</small>
          <div id="rsOnline" style="font-size:28px;font-weight:800;color:#a98aff">—</div>
        </div>
        <div style="padding:14px;border-radius:12px;background:#241832">
          <small>Acessos nas últimas 24h</small>
          <div id="rs24h" style="font-size:28px;font-weight:800;color:#fff">—</div>
        </div>
        <div style="padding:14px;border-radius:12px;background:#241832">
          <small>Acessos hoje</small>
          <div id="rsToday" style="font-size:28px;font-weight:800;color:#fff">—</div>
        </div>
      </div>
      <small style="display:block;margin-top:12px;color:#9c91aa">
        *Online agora = navegador com atividade nos últimos 5 minutos. Visitantes únicos são estimados por navegador/dispositivo.
      </small>
    `;
    operatorPanel.appendChild(section);
    document.getElementById("rsAnalyticsRefresh").addEventListener("click", loadStats);
  }

  async function loadStats() {
    const status = document.getElementById("rsAnalyticsStatus");
    if (!status) return;
    status.textContent = "Consultando estatísticas…";

    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        status.textContent = "Entre na sua conta do Roulette System para consultar as estatísticas.";
        return;
      }

      const { data, error } = await client.rpc("rs_operator_stats");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Nenhum dado retornado.");

      document.getElementById("rsUnique").textContent =
        Number(row.unique_visitors || 0).toLocaleString("pt-BR");
      document.getElementById("rsOnline").textContent =
        Number(row.online_now || 0).toLocaleString("pt-BR");
      document.getElementById("rs24h").textContent =
        Number(row.visits_24h || 0).toLocaleString("pt-BR");
      document.getElementById("rsToday").textContent =
        Number(row.visits_today || 0).toLocaleString("pt-BR");
      status.textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR");
    } catch (error) {
      status.textContent = error?.message || "Não foi possível carregar as estatísticas.";
    }
  }

  addOperatorDashboard();

  const operatorPanel = document.getElementById("operatorPanel");
  if (operatorPanel) {
    new MutationObserver(() => {
      if (!operatorPanel.hidden) loadStats();
    }).observe(operatorPanel, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }
})();
