from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.generator import generate_svg
from app.parser import parse_sentence

app = FastAPI()

STATIC_DIR = Path(__file__).resolve().parent / "static"


class GenerateRequest(BaseModel):
    code: str


class ParseRequest(BaseModel):
    sentence: str


@app.get("/")
def root():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/document")
def document():
    return FileResponse(STATIC_DIR / "document.html")


@app.post("/api/parse")
def api_parse(req: ParseRequest):
    sentence = req.sentence.strip()
    if not sentence:
        raise HTTPException(status_code=400, detail="请提供要解析的句子")
    try:
        code = parse_sentence(sentence)
        return {"status": "success", "code": code}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
