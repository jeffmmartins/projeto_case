from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import pandas as pd

app = FastAPI()

# Carrega os dados dos CSV
users_df = pd.read_csv("users.csv")
metrics_df = pd.read_csv("metrics.csv")

# Segurança simples com token fake (poderia ser JWT, mas para o teste basta isso)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Modelo de login
class Login(BaseModel):
    email: str
    password: str

# Endpoint de login
@app.post("/login")
def login(user: Login):
    usuario = users_df[
        (users_df["email"] == user.email) & 
        (users_df["password"] == user.password)
    ]
    if usuario.empty:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    role = usuario.iloc[0]["role"]
    token = f"{user.email}:{role}"  # token simples
    return {"access_token": token, "role": role}

# Função para validar usuário e papel
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        email, role = token.split(":")
        return {"email": email, "role": role}
    except:
        raise HTTPException(status_code=401, detail="Token inválido")

# Endpoint de métricas
@app.get("/metrics")
def get_metrics(current_user: dict = Depends(get_current_user)):
    df = metrics_df.copy()

    # Se não for admin, oculta coluna cost_micros
    if current_user["role"] != "admin":
        df = df.drop(columns=["cost_micros"])

    return df.to_dict(orient="records")
