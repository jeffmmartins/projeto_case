// URL base da sua API FastAPI
const API_BASE_URL = "http://127.0.0.1:8000";

let userToken = null; // Armazena o token de acesso (email:role)
let currentSortColumn = null; // Armazena a coluna de ordenação atual

// Elementos da UI
const statusMessage = document.getElementById("status-message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loadButton = document.getElementById("load-metrics-btn");
const tableBody = document.getElementById("table-body");
const tableHeader = document.getElementById("table-header");
const startDateInput = document.getElementById("start_date");
const endDateInput = document.getElementById("end_date");
const sortOrderSelect = document.getElementById("sort_order");

// Função que substitui o alert() e exibe o status na interface
function displayStatus(message, isError = false) {
    statusMessage.innerHTML = message;
    statusMessage.classList.remove("error-message", "success-message", "text-gray-500");
    if (isError) {
        statusMessage.classList.add("error-message");
    } else {
        statusMessage.classList.add("success-message");
    }
}

// Lógica de Login
async function handleLogin() {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        displayStatus("Por favor, preencha o email e a senha.", true);
        return;
    }
    
    displayStatus("Conectando...", false);

    try {
        const res = await fetch(`${API_BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        if (res.ok) {
            userToken = data.access_token;
            loadButton.disabled = false; // Habilita o botão de carregar métricas
            displayStatus(`✅ Login bem-sucedido! Usuário: <span class="font-bold">${data.role.toUpperCase()}</span>.`, false);
            // Tenta carregar as métricas após o login
            await loadMetrics();
        } else {
            displayStatus(`❌ Erro no Login: ${data.detail || "Credenciais inválidas."}`, true);
            userToken = null;
            loadButton.disabled = true;
            tableBody.innerHTML = `<tr><td colspan="100%" class="text-center py-4 text-gray-500">Faça login para carregar as métricas.</td></tr>`;
        }

    } catch (error) {
        displayStatus("❌ Erro de conexão com a API. Verifique se o servidor está rodando.", true);
        userToken = null;
        loadButton.disabled = true;
    }
}

// Lógica de Carregamento de Métricas com Filtros
async function loadMetrics() {
    if (!userToken) {
        displayStatus("⚠️ É necessário fazer login primeiro.", true);
        return;
    }
    
    displayStatus("Carregando métricas...", false);

    // Obtém os parâmetros de filtro e ordenação da interface
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const sortOrder = sortOrderSelect.value;
    
    // Constrói os parâmetros da URL para filtro e ordenação
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (currentSortColumn) params.append("sort_by", currentSortColumn);
    params.append("sort_order", sortOrder);
    
    const url = `${API_BASE_URL}/metrics?${params.toString()}`;
    
    try {
        const res = await fetch(url, {
            headers: { 
                "Authorization": `Bearer ${userToken}` 
            }
        });
        
        const data = await res.json();

        if (res.ok) {
            renderTable(data);
        } else {
            displayStatus(`Erro ao carregar métricas: ${data.detail || "Falha na comunicação."}`, true);
            tableBody.innerHTML = `<tr><td colspan="100%" class="text-center py-4 text-red-500">${data.detail || "Erro ao carregar dados."}</td></tr>`;
        }

    } catch (error) {
        displayStatus("Erro de rede ao buscar métricas.", true);
    }
}

// 🔹 Função de Renderização da Tabela
function renderTable(data) {
    tableBody.innerHTML = "";
    tableHeader.innerHTML = "";

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" class="text-center py-4 text-gray-500">Nenhum dado encontrado com os filtros aplicados.</td></tr>';
        return;
    }

    // Cria o cabeçalho
    const headers = Object.keys(data[0]);
    headers.forEach(key => {
        const th = document.createElement('th');
        // Formata a chave para exibição (ex: cost_micros -> Cost Micros)
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        th.textContent = formattedKey;
        th.classList.add('px-6', 'py-3', 'text-xs', 'font-medium', 'text-gray-500', 'uppercase', 'tracking-wider');
        
        // Adiciona evento de ordenação ao cabeçalho (REQUISITO IMPLEMENTADO)
        th.addEventListener('click', () => {
            currentSortColumn = key; 
            loadMetrics(); // Chama a API com a nova coluna de ordenação
        });
        tableHeader.appendChild(th);
    });

    // Cria as linhas de dados
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(key => {
            const td = document.createElement('td');
            const value = row[key];
            
            // Formatação de Custo (cost_micros) para BRL (se a coluna existir)
            if (key.includes('micros') && typeof value === 'number') {
                td.textContent = (value / 1000000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            } else {
                td.textContent = value;
            }
            
            td.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'text-gray-900');
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    
    displayStatus(`✅ Métricas carregadas. (${data.length} linhas)`, false);
}

// Inicializa a UI
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona listeners aos controles de filtro e ordenação para recarregar as métricas
    sortOrderSelect.addEventListener('change', loadMetrics);
    startDateInput.addEventListener('change', loadMetrics);
    endDateInput.addEventListener('change', loadMetrics);
});