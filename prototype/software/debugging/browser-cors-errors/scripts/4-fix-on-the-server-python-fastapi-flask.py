# Input:  FastAPI or Flask app with CORS issues
# Output: Properly configured CORS middleware

# === FastAPI ===
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.example.com",
        "https://www.example.com",
    ],
    # OR for public API: allow_origins=["*"]
    allow_credentials=True,   # Set False if using allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
    max_age=86400,
)

@app.get("/api/data")
async def get_data():
    return {"data": "hello"}


# === Flask ===
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

CORS(app,
     origins=["https://app.example.com"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     max_age=86400)

@app.route("/api/data")
def get_data():
    return {"data": "hello"}
