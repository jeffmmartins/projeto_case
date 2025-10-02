from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import pandas as pd

app = FastAPI()

# 🔹 Carregando arquivos .ods fornecidos no case
users_df = pd.read_excel("users.ods", engine="odf")
metrics_df = pd.read_excel("metrics.ods", engine="odf")

# 🔹 Configuração simples para token Bearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Modelo esperado no corpo do login
class Login(BaseModel):
    email: str
    password: str

# 🔹 Endpoint de login
@app.post("/login")
def login(user: Login):
    usuario = users_df[
        (users_df["email"] == user.email) & 
        (users_df["password"] == user.password)
    ]

    if usuario.empty:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    role = usuario.iloc[0]["role"]
    token = f"{user.email}:{role}"  # token simples (email:role)
    return {"access_token": token, "role": role}

# 🔹 Função para extrair usuário atual do token
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        email, role = token.split(":")
        return {"email": email, "role": role}
    except:
        raise HTTPException(status_code=401, detail="Token inválido")

# 🔹 Endpoint de métricas
@app.get("/metrics")
def get_metrics(current_user: dict = Depends(get_current_user)):
    df = metrics_df.copy()

    # Se não for admin, remove a coluna cost_micros
    if current_user["role"] != "admin" and "cost_micros" in df.columns:
        df = df.drop(columns=["cost_micros"])

    return df.to_dict(orient="records")
