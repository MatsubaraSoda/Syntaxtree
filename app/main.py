from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.generator import generate_svg

app = FastAPI()

STATIC_DIR = Path(__file__).resolve().parent / "static"


class GenerateRequest(BaseModel):
    code: str


@app.get("/")
def root():
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/generate")
def api_generate(req: GenerateRequest):
    code = req.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="请提供括号表达式")
    try:
        svg_content = generate_svg(code)
        return {"status": "success", "svg_content": svg_content}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
