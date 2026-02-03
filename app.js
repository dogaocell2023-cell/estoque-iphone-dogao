const KEY = "dogao_estoque_iphones_v1";

function nowISO(){ return new Date().toISOString().slice(0,10); }

function load(){
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {items:[], vendas:[]}; }
  catch { return {items:[], vendas:[]}; }
}
function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

function moneyToNumber(v){
  if(!v) return null;
  const s = String(v).trim().replace(/\./g,"").replace(",",".").replace(/[^\d.]/g,"");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function uid(){
  return "IP" + Date.now().toString(36) + Math.random().toString(36).slice(2,6).toUpperCase();
}

function csvEscape(v){
  const s = (v ?? "").toString().replace(/\r?\n/g," ");
  return `"${s.replace(/"/g,'""')}"`;
}

function toCSV(db){
  const header = ["id","modelo","armazenamento","cor","bateria","faceid","imei","status","dataEntrada","custo","preco","obs","dataVenda","cliente","valorVendido","pagamento","obsVenda"];
  const rows = [header.join(",")];

  const byIdVenda = new Map(db.vendas.map(v=>[v.id, v]));
  for(const it of db.items){
    const venda = byIdVenda.get(it.id) || {};
    const row = [
      it.id, it.modelo, it.armazenamento, it.cor, it.bateria, it.faceid, it.imei,
      it.status, it.dataEntrada, it.custo, it.preco, it.obs,
      venda.dataVenda, venda.cliente, venda.valor, venda.pagamento, venda.obsVenda
    ].map(csvEscape).join(",");
    rows.push(row);
  }
  return rows.join("\n");
}

function parseCSV(text){
  // parser simples (assume CSV gerado pelo app)
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift().split(",").map(h=>h.replace(/^"|"$/g,""));
  const idx = (name)=>header.indexOf(name);

  const items = [];
  const vendas = [];
  for(const line of lines){
    const cols = line.match(/("([^"]|"")*"|[^,]+)/g)?.map(c=>{
      c = c.trim();
      if(c.startsWith('"') && c.endsWith('"')) c = c.slice(1,-1).replace(/""/g,'"');
      return c;
    }) || [];
    const it = {
      id: cols[idx("id")],
      modelo: cols[idx("modelo")],
      armazenamento: cols[idx("armazenamento")],
      cor: cols[idx("cor")],
      bateria: cols[idx("bateria")],
      faceid: cols[idx("faceid")],
      imei: cols[idx("imei")],
      status: cols[idx("status")] || "estoque",
      dataEntrada: cols[idx("dataEntrada")] || nowISO(),
      custo: moneyToNumber(cols[idx("custo")]),
      preco: moneyToNumber(cols[idx("preco")]),
      obs: cols[idx("obs")] || ""
    };
    items.push(it);

    const dataVenda = cols[idx("dataVenda")];
    if(dataVenda){
      vendas.push({
        id: it.id,
        dataVenda,
        cliente: cols[idx("cliente")] || "",
        valor: moneyToNumber(cols[idx("valorVendido")]),
        pagamento: cols[idx("pagamento")] || "",
        obsVenda: cols[idx("obsVenda")] || ""
      });
    }
  }
  return {items, vendas};
}

// UI
const qEl = document.getElementById("q");
const filterEl = document.getElementById("filterStatus");
const listaEl = document.getElementById("lista");
const statsEl = document.getElementById("stats");
const saidaIdEl = document.getElementById("saidaId");

function render(){
  const db = load();
  const q = (qEl.value||"").toLowerCase().trim();
  const fil = filterEl.value;

  const items = db.items.slice().sort((a,b)=> (b.dataEntrada||"").localeCompare(a.dataEntrada||""));
  const filtered = items.filter(it=>{
    if(fil !== "all" && it.status !== fil) return false;
    if(!q) return true;
    const blob = [it.modelo,it.armazenamento,it.cor,it.bateria,it.imei,it.obs,it.id].join(" ").toLowerCase();
    return blob.includes(q);
  });

  // stats
  const emEstoque = items.filter(i=>i.status==="estoque").length;
  const vendidos = items.filter(i=>i.status==="vendido").length;
  statsEl.textContent = `Em estoque: ${emEstoque} • Vendidos: ${vendidos} • Total: ${items.length}`;

  // lista
  listaEl.innerHTML = "";
  for(const it of filtered){
    const badge = it.status==="estoque"
      ? `<span class="badge ok">Em estoque</span>`
      : `<span class="badge out">Vendido</span>`;

    const custo = (it.custo!=null) ? `Custo: R$ ${it.custo.toFixed(2)}` : "";
    const preco = (it.preco!=null) ? `Preço: R$ ${it.preco.toFixed(2)}` : "";
    const bat = it.bateria ? `Bateria: ${it.bateria}%` : "";

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="top">
        <strong>${it.modelo} • ${it.armazenamento}GB</strong>
        ${badge}
      </div>
      <div class="meta">
        ID: ${it.id}<br/>
        ${[it.cor, bat, `Face ID: ${it.faceid?.toUpperCase()}`, it.imei?`IMEI: ${it.imei}`:""].filter(Boolean).join(" • ")}<br/>
        Entrada: ${it.dataEntrada || "-"} ${custo ? " • " + custo : ""} ${preco ? " • " + preco : ""}
        ${it.obs ? `<br/>Obs: ${it.obs}` : ""}
      </div>
      <div class="smallActions">
        <button data-edit="${it.id}">Editar</button>
        <button data-del="${it.id}" class="danger">Excluir</button>
      </div>
    `;
    listaEl.appendChild(div);
  }

  // select saída (somente estoque)
  const stock = items.filter(i=>i.status==="estoque");
  saidaIdEl.innerHTML = `<option value="">Selecione o iPhone</option>` + stock.map(i=>
    `<option value="${i.id}">${i.modelo} • ${i.armazenamento}GB • ${i.cor||""} • ID ${i.id}</option>`
  ).join("");

  // actions
  document.querySelectorAll("[data-del]").forEach(btn=>{
    btn.onclick = () => {
      const id = btn.getAttribute("data-del");
      const ok = confirm("Excluir este iPhone do sistema?");
      if(!ok) return;
      const db2 = load();
      db2.items = db2.items.filter(i=>i.id!==id);
      db2.vendas = db2.vendas.filter(v=>v.id!==id);
      save(db2);
      render();
    };
  });

  document.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.onclick = () => {
      const id = btn.getAttribute("data-edit");
      const db2 = load();
      const it = db2.items.find(i=>i.id===id);
      if(!it) return;
      const modelo = prompt("Modelo:", it.modelo) ?? it.modelo;
      const armazenamento = prompt("Armazenamento (GB):", it.armazenamento) ?? it.armazenamento;
      const cor = prompt("Cor:", it.cor ?? "") ?? it.cor;
      const bateria = prompt("Bateria (%):", it.bateria ?? "") ?? it.bateria;
      const imei = prompt("IMEI/Serial:", it.imei ?? "") ?? it.imei;
      const obs = prompt("Observações:", it.obs ?? "") ?? it.obs;
      it.modelo = modelo; it.armazenamento = armazenamento; it.cor = cor;
      it.bateria = bateria; it.imei = imei; it.obs = obs;
      save(db2);
      render();
    };
  });
}

document.getElementById("formEntrada").addEventListener("submit", (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const db = load();
  const it = {
    id: uid(),
    modelo: (fd.get("modelo")||"").toString().trim(),
    armazenamento: (fd.get("armazenamento")||"").toString().trim(),
    cor: (fd.get("cor")||"").toString().trim(),
    bateria: (fd.get("bateria")||"").toString().trim(),
    faceid: (fd.get("faceid")||"on").toString(),
    imei: (fd.get("imei")||"").toString().trim(),
    status: "estoque",
    dataEntrada: nowISO(),
    custo: moneyToNumber(fd.get("custo")),
    preco: moneyToNumber(fd.get("preco")),
    obs: (fd.get("obs")||"").toString().trim()
  };
  db.items.unshift(it);
  save(db);
  e.target.reset();
  render();
});

document.getElementById("formSaida").addEventListener("submit", (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const id = saidaIdEl.value;
  if(!id) return alert("Selecione um iPhone!");
  const db = load();
  const it = db.items.find(i=>i.id===id);
  if(!it) return alert("iPhone não encontrado!");
  it.status = "vendido";

  const venda = {
    id,
    dataVenda: nowISO(),
    cliente: (fd.get("cliente")||"").toString().trim(),
    valor: moneyToNumber(fd.get("valor")),
    pagamento: (fd.get("pagamento")||"").toString(),
    obsVenda: (fd.get("obsVenda")||"").toString().trim()
  };
  db.vendas = db.vendas.filter(v=>v.id!==id);
  db.vendas.push(venda);
  save(db);
  e.target.reset();
  render();
});

qEl.oninput = render;
filterEl.onchange = render;

document.getElementById("btnExport").onclick = ()=>{
  const db = load();
  const csv = toCSV(db);
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estoque_iphones_${nowISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

document.getElementById("fileImport").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const text = await file.text();
  const db = parseCSV(text);
  save(db);
  alert("Importado com sucesso!");
  render();
  e.target.value = "";
});

document.getElementById("btnReset").onclick = ()=>{
  const ok = confirm("Tem certeza que quer zerar tudo?");
  if(!ok) return;
  save({items:[], vendas:[]});
  render();
};

render();
