from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from starlette.requests import Request

from app.document import append_pending_tags, document_json_path, load_document
from app.pipeline import generate_svg, parse_sentence

app = FastAPI()

STATIC_DIR = Path(__file__).resolve().parent / "static"
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
DOCUMENT_JSON = document_json_path(STATIC_DIR)

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


class GenerateRequest(BaseModel):
    code: str


class ParseRequest(BaseModel):
    sentence: str


@app.get("/")
def root():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/document", response_class=HTMLResponse)
def document(request: Request):
    if not DOCUMENT_JSON.is_file():
        raise HTTPException(status_code=500, detail="document.json 缺失或不可读")
    try:
        doc = load_document(DOCUMENT_JSON)
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"document.json 读取失败: {e}") from e
    meta = doc.get("meta", {})
    sections = doc.get("sections", [])
    return templates.TemplateResponse(
        "document_page.html.j2",
        {"request": request, "meta": meta, "sections": sections},
    )


@app.post("/api/parse")
def api_parse(req: ParseRequest):
    sentence = req.sentence.strip()
    if not sentence:
        raise HTTPException(status_code=400, detail="请提供要解析的句子")
    try:
        result = parse_sentence(sentence)
        if DOCUMENT_JSON.is_file():
            try:
                append_pending_tags(DOCUMENT_JSON, sentence, result.labels)
            except OSError as e:
                raise HTTPException(
                    status_code=500, detail=f"更新 document.json 失败: {e}"
                ) from e
        return {
            "status": "success",
            "code": result.code,
            "labels": result.labels,
        }
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
