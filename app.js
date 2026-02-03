const LS = "dogao_control_v1";

let db = JSON.parse(localStorage.getItem(LS) || "{}");
db.clientes ||= [];
db.movs ||= [];
db.iphones ||= [];

function save(){
  localStorage.setItem(LS, JSON.stringify(db));
}

function hoje(){
  return new Date().toISOString().slice(0,10);
}

function add30(){
  const d = new Date();
  d.setDate(d.getDate()+30);
  return d.toISOString().slice(0,10);
}

function atrasado(venc){
  return venc < hoje();
}

/* ===== TABS ===== */
document.querySelectorAll(".tab").forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".tabPage").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    document.getElementById("tab-"+b.dataset.tab).classList.add("active");
  }
});

/* ===== CLIENTES ===== */
const selCliente = document.getElementById("movClienteId");
const listaClientes = document.getElementById("clientesLista");

function renderClientes(){
  selCliente.innerHTML = db.clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join("");
  listaClientes.innerHTML = db.clientes.map(c=>{
    const movs = db.movs.filter(m=>m.clienteId===c.id);
    let saldo = 0;
    let venc = "";
    movs.forEach(m=>{
      if(m.tipo==="fiado"){ saldo+=m.valor; venc=m.vencimento; }
      else saldo-=m.valor;
    });
    return `<div>
      <b>${c.nome}</b><br>
      Saldo: R$ ${saldo.toFixed(2)} 
      ${saldo>0 && atrasado(venc) ? `<span class="late">ATRASADO</span>`:""}
    </div>`;
  }).join("");
}

document.getElementById("formCliente").onsubmit=e=>{
  e.preventDefault();
  const f=e.target;
  db.clientes.push({id:Date.now(),nome:f.nome.value});
  f.reset(); save(); renderClientes();
};

document.getElementById("formMov").onsubmit=e=>{
  e.preventDefault();
  const f=e.target;
  const tipo=f.tipo.value;
  db.movs.push({
    clienteId:+selCliente.value,
    tipo,
    valor:+f.valor.value,
    vencimento: tipo==="fiado"?add30():""
  });
  f.reset(); save(); renderClientes();
};

/* ===== IPHONES ===== */
const listaI = document.getElementById("iphoneLista");

document.getElementById("formIphoneEntrada").onsubmit=e=>{
  e.preventDefault();
  const f=e.target;
  db.iphones.push({
    id:Date.now(),
    modelo:f.modelo.value,
    gb:f.gb.value,
    preco:f.preco.value
  });
  f.reset(); save(); renderIphones();
};

function renderIphones(){
  listaI.innerHTML=db.iphones.map(i=>`<div>
    ${i.modelo} ${i.gb}GB - R$ ${i.preco}
  </div>`).join("");
}

/* ===== PDF ===== */
document.getElementById("btnPDF").onclick=()=>window.print();
document.getElementById("btnReset").onclick=()=>{
  if(confirm("Zerar tudo?")){
    localStorage.removeItem(LS);
    location.reload();
  }
};

renderClientes();
renderIphones();
