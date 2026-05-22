import io
import pdfplumber
from docx import Document


def extract_text(file, file_type):
    """Extract text from a PDF or DOCX file."""
    if file_type == "pdf":
        return _extract_from_pdf(file)
    elif file_type == "docx":
        return _extract_from_docx(file)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def _extract_from_pdf(file):
    text_parts = []
    file.seek(0)
    with pdfplumber.open(io.BytesIO(file.read())) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_from_docx(file):
    file.seek(0)
    doc = Document(io.BytesIO(file.read()))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
