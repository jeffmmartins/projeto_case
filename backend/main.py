from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from typing import Optional

# Configuração da Aplicação
app = FastAPI(title="Monks Metrics API", version="1.0")

# Configuração para permitir a comunicação entre a API e o frontend
origins = ["*"] 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Carregando arquivos .csv
try:
    users_df = pd.read_csv("users.csv")
    metrics_df = pd.read_csv("metrics.csv")
    # Garante que a coluna 'date' seja tratada como data para o filtro
    metrics_df["date"] = pd.to_datetime(metrics_df["date"], errors='coerce').dt.date
except FileNotFoundError:
    raise RuntimeError("🚨 Erro: Arquivos 'users.csv' ou 'metrics.csv' não encontrados.")
except Exception as e:
    raise RuntimeError(f"🚨 Erro ao carregar ou processar CSVs: {e}")


# Configuração para token Bearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Modelo esperado no corpo do login
class Login(BaseModel):
    email: str
    password: str

# Endpoint de login
@app.post("/login")
def login(user: Login):
    """Realiza o login e retorna um token simples (email:role)."""
    usuario = users_df[
        (users_df["email"] == user.email) & 
        (users_df["password"] == user.password)
    ]

    if usuario.empty:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    role = usuario.iloc[0]["role"]
    token = f"{user.email}:{role}" 
    
    return {"access_token": token, "token_type": "bearer", "role": role}

# Função para extrair usuário atual do token
def get_current_user(token: str = Depends(oauth2_scheme)):
    """Decodifica o token para obter o email e a role do usuário."""
    try:
        email, role = token.split(":")
        if email not in users_df["email"].values:
             raise HTTPException(status_code=401, detail="Token inválido ou usuário não existe.")
        return {"email": email, "role": role}
    except:
        raise HTTPException(status_code=401, detail="Token inválido. Faça login novamente.")


# Endpoint de métricas com Filtro e Ordenação
@app.get("/metrics")
def get_metrics(
    current_user: dict = Depends(get_current_user),
    start_date: Optional[str] = Query(None, description="Data de início para o filtro (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data final para o filtro (YYYY-MM-DD)"),
    sort_by: Optional[str] = Query(None, description="Coluna para ordenação"),
    sort_order: Optional[str] = Query("asc", description="Ordem: 'asc' ou 'desc'")
):
    """
    Retorna as métricas de performance, aplicando filtros de data, 
    ordenação, e a regra de visibilidade da coluna 'cost_micros'.
    """
    df = metrics_df.copy()
    
    # 1. Aplicar Filtro por Data
    if start_date or end_date:
        try:
            start = pd.to_datetime(start_date).date() if start_date else df["date"].min()
            end = pd.to_datetime(end_date).date() if end_date else df["date"].max()
            df = df[(df["date"] >= start) & (df["date"] <= end)]
        except:
            raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")

    # 2. Aplicar Ordenação
    if sort_by and sort_by in df.columns:
        ascending = sort_order.lower() == "asc"
        df[sort_by] = df[sort_by].astype(str)
        df = df.sort_values(by=sort_by, ascending=ascending)
    
    # 3. Regra de Visibilidade da Coluna
    if current_user["role"] != "admin" and "cost_micros" in df.columns:
        df = df.drop(columns=["cost_micros"])
        
    return df.to_dict(orient="records")