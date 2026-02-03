const LS_KEY = "dogao_estoque_iphone_v2";

const elLista = document.getElementById("lista");
const elStats = document.getElementById("stats");
const elQ = document.getElementById("q");
const elFilter = document.getElementById("filterStatus");

const formEntrada = document.getElementById("formEntrada");
const formSaida = document.getElementById("formSaida");
const saidaId = document.getElementById("saidaId");

const btnExport = document.getElementById("btnExport");
const fileImport = document.getElementById("fileImport");
const btnReset = document.getElementById("btnReset");
const btnPDF = document.getElementById("btnPDF");

function moneyToNumber(v){
  if (v == null) return 0;
  const s = String(v).trim().replace(/\./g,"").replace(",",".").replace(/[^\d.-]/g,"");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function fmtBRL(n){
  try{
    return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  }catch{
    return "R$ " + (Math.round(n*100)/100).toFixed(2).replace(".",",");
  }
}
function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function uid(){
  return "IP" + Math.random().toString(36).slice(2,10).toUpperCase();
}

function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  }catch{
    return [];
  }
}
function save(data){
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

let db = load();

function compute(db){
  const emEstoque = db.filter(x => x.status !== "vendido");
  const vendidos = db.filter(x => x.status === "vendido");

  const custoEstoque = emEstoque.reduce((a,x)=>a + moneyToNumber(x.custo), 0);
  const precoEstoque = emEstoque.reduce((a,x)=>a + moneyToNumber(x.preco), 0);
  const lucroPrev = precoEstoque - custoEstoque;

  const totalVendido = vendidos.reduce((a,x)=>a + moneyToNumber(x.valorVendido), 0);
  const custoVendido = vendidos.reduce((a,x)=>a + moneyToNumber(x.custo), 0);
  const lucroReal = totalVendido - custoVendido;

  return {
    qtdEstoque: emEstoque.length,
    qtdVendido: vendidos.length,
    qtdTotal: db.length,
    custoEstoque, precoEstoque, lucroPrev,
    totalVendido, lucroReal
  };
}

function fillSaidaSelect(db){
  const emEstoque = db.filter(x => x.status !== "vendido");
  saidaId.innerHTML = `<option value="" disabled selected>Selecione o iPhone</option>` +
    emEstoque.map(x => `<option value="${x.id}">${x.modelo} ${x.armazenamento}GB • ${x.cor || ""} • ID:${x.id}</option>`).join("");
}

function renderStats(){
  const s = compute(db);
  elStats.innerHTML = `
    <div class="kpi">
      <div class="title">📦 Quantidades</div>
      <div class="value">Em estoque: ${s.qtdEstoque} • Vendidos: ${s.qtdVendido} • Total: ${s.qtdTotal}</div>
    </div>
    <div class="kpi">
      <div class="title">💰 Somatório (Em estoque)</div>
      <div class="value">Custo: ${fmtBRL(s.custoEstoque)} • Preço: ${fmtBRL(s.precoEstoque)} • Lucro previsto: ${fmtBRL(s.lucroPrev)}</div>
    </div>
    <div class="kpi">
      <div class="title">✅ Somatório (Vendidos)</div>
      <div class="value">Total vendido: ${fmtBRL(s.totalVendido)} • Lucro realizado: ${fmtBRL(s.lucroReal)}</div>
    </div>
  `;
}

function matchesQuery(item, q){
  if(!q) return true;
  const hay = [
    item.modelo, item.armazenamento, item.cor, item.bateria,
    item.faceid, item.imei, item.obs,
    item.cliente, item.pagamento, item.obsVenda, item.id
  ].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function render(){
  renderStats();
  fillSaidaSelect(db);

  const q = elQ.value.trim();
  const f = elFilter.value;

  const filtered = db
    .filter(x => matchesQuery(x, q))
    .filter(x => f === "all" ? true : (f === "estoque" ? x.status !== "vendido" : x.status === "vendido"))
    .sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  elLista.innerHTML = filtered.map(item => {
    const isSold = item.status === "vendido";
    const badge = isSold
      ? `<span class="badge bad">Vendido</span>`
      : `<span class="badge ok">Em estoque</span>`;

    const lucro = isSold
      ? (moneyToNumber(item.valorVendido) - moneyToNumber(item.custo))
      : (moneyToNumber(item.preco) - moneyToNumber(item.custo));

    const lucroTxt = fmtBRL(lucro);

    return `
      <div class="item">
        <div class="itemHeader">
          <div>
            <h3 class="itemTitle">${item.modelo} • ${item.armazenamento}GB</h3>
          </div>
          ${badge}
        </div>

        <div class="itemMeta">
          <div><b>ID:</b> ${item.id}</div>
          <div>${item.cor ? `<b>Cor:</b> ${item.cor} • ` : ""}${item.bateria ? `<b>Bateria:</b> ${item.bateria}% • ` : ""}<b>Face ID:</b> ${String(item.faceid).toUpperCase()} ${item.imei ? `• <b>IMEI:</b> ${item.imei}` : ""}</div>
          <div><b>Entrada:</b> ${item.entrada || ""} • <b>Custo:</b> ${fmtBRL(moneyToNumber(item.custo))} • <b>Preço:</b> ${fmtBRL(moneyToNumber(item.preco))}</div>
          <div><b>Lucro:</b> ${lucroTxt}</div>
          ${item.obs ? `<div><b>Obs:</b> ${item.obs}</div>` : ""}
          ${isSold ? `<div><b>Venda:</b> ${item.dataVenda || ""} • <b>Cliente:</b> ${item.cliente || "-"} • <b>Pago:</b> ${fmtBRL(moneyToNumber(item.valorVendido))} • <b>Pgto:</b> ${item.pagamento || "-"}</div>` : ""}
          ${isSold && item.obsVenda ? `<div><b>Obs venda:</b> ${item.obsVenda}</div>` : ""}
        </div>

        <div class="actionsItem">
          <button class="secondary" onclick="editItem('${item.id}')">Editar</button>
          <button class="danger" onclick="delItem('${item.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

window.editItem = function(id){
  const item = db.find(x => x.id === id);
  if(!item) return;

  const modelo = prompt("Modelo:", item.modelo) ?? item.modelo;
  const armazenamento = prompt("Armazenamento (GB):", item.armazenamento) ?? item.armazenamento;
  const cor = prompt("Cor:", item.cor || "") ?? (item.cor || "");
  const bateria = prompt("Bateria %:", item.bateria || "") ?? (item.bateria || "");
  const faceid = prompt("Face ID (on/off):", item.faceid || "on") ?? (item.faceid || "on");
  const imei = prompt("IMEI/Serial:", item.imei || "") ?? (item.imei || "");
  const custo = prompt("Custo (R$):", item.custo || "") ?? (item.custo || "");
  const preco = prompt("Preço venda (R$):", item.preco || "") ?? (item.preco || "");
  const obs = prompt("Observações:", item.obs || "") ?? (item.obs || "");

  Object.assign(item, { modelo, armazenamento, cor, bateria, faceid, imei, custo, preco, obs });
  save(db);
  render();
};

window.delItem = function(id){
  if(!confirm("Tem certeza que deseja excluir este iPhone?")) return;
  db = db.filter(x => x.id !== id);
  save(db);
  render();
};

formEntrada.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(formEntrada);

  const item = {
    id: uid(),
    status: "estoque",
    modelo: (fd.get("modelo") || "").toString().trim(),
    armazenamento: (fd.get("armazenamento") || "").toString().trim(),
    cor: (fd.get("cor") || "").toString().trim(),
    bateria: (fd.get("bateria") || "").toString().trim(),
    faceid: (fd.get("faceid") || "on").toString(),
    imei: (fd.get("imei") || "").toString().trim(),
    custo: (fd.get("custo") || "").toString().trim(),
    preco: (fd.get("preco") || "").toString().trim(),
    obs: (fd.get("obs") || "").toString().trim(),
    entrada: todayISO(),
    createdAt: Date.now()
  };

  db.unshift(item);
  save(db);
  formEntrada.reset();
  render();
});

formSaida.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = saidaId.value;
  const item = db.find(x => x.id === id);
  if(!item) return alert("Selecione um iPhone válido.");

  const fd = new FormData(formSaida);
  const valor = (fd.get("valor") || "").toString().trim();
  const cliente = (fd.get("cliente") || "").toString().trim();
  const pagamento = (fd.get("pagamento") || "").toString().trim();
  const obsVenda = (fd.get("obsVenda") || "").toString().trim();

  if(!valor) return alert("Informe o valor vendido.");

  item.status = "vendido";
  item.valorVendido = valor;
  item.cliente = cliente;
  item.pagamento = pagamento;
  item.obsVenda = obsVenda;
  item.dataVenda = todayISO();

  save(db);
  formSaida.reset();
  render();
});

/* Exportar CSV (sem fotos) */
function toCSV(rows){
  const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const header = [
    "id","status","modelo","armazenamento","cor","bateria","faceid","imei",
    "custo","preco","obs","entrada",
    "valorVendido","cliente","pagamento","obsVenda","dataVenda"
  ];
  const lines = [header.join(",")];
  for(const r of rows){
    lines.push(header.map(k => esc(r[k])).join(","));
  }
  return lines.join("\n");
}

btnExport.addEventListener("click", () => {
  const csv = toCSV(db);
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estoque_iphone_dogao_${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

fileImport.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(lines.length < 2) return alert("CSV vazio.");

  const header = lines[0].split(",").map(s => s.replace(/^"|"$/g,""));
  const data = [];

  for(let i=1;i<lines.length;i++){
    const line = lines[i];
    const cols = [];
    let cur = "";
    let inside = false;
    for(let j=0;j<line.length;j++){
      const ch = line[j];
      if(ch === '"' && line[j+1] === '"'){ cur += '"'; j++; continue; }
      if(ch === '"'){ inside = !inside; continue; }
      if(ch === "," && !inside){ cols.push(cur); cur=""; continue; }
      cur += ch;
    }
    cols.push(cur);

    const obj = {};
    header.forEach((k, idx) => obj[k] = cols[idx] ?? "");
    obj.createdAt = obj.createdAt ? Number(obj.createdAt) : Date.now();
    data.push(obj);
  }

  if(!confirm("Importar este CSV vai substituir o estoque atual. Continuar?")) return;
  db = data;
  save(db);
  render();
  fileImport.value = "";
});

btnReset.addEventListener("click", () => {
  if(!confirm("Tem certeza que deseja ZERAR tudo?")) return;
  db = [];
  save(db);
  render();
});

/* Exportar PDF (imprimir/salvar PDF no iPhone) */
btnPDF.addEventListener("click", () => {
  window.print();
});

elQ.addEventListener("input", render);
elFilter.addEventListener("change", render);

render();
