let token = null;

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://127.0.0.1:8000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  token = data.access_token;
  alert("Logado como: " + data.role);
}

async function loadMetrics() {
  const res = await fetch("http://127.0.0.1:8000/metrics", {
    headers: { "Authorization": "Bearer " + token }
  });

  const dados = await res.json();
  const tabela = document.getElementById("tabela");

  tabela.innerHTML = "";
  if (dados.length > 0) {
    // Cabeçalho
    const header = Object.keys(dados[0]).map(k => `<th>${k}</th>`).join("");
    tabela.innerHTML += `<tr>${header}</tr>`;

    // Linhas
    dados.forEach(row => {
      const linha = Object.values(row).map(v => `<td>${v}</td>`).join("");
      tabela.innerHTML += `<tr>${linha}</tr>`;
    });
  }
}