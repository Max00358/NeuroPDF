import fitz
import json
import sys
from rapidfuzz import fuzz

pdf_path = sys.argv[1]
LLM_answer = sys.argv[2]
highlight_text = []
highlighted = False

def is_similar(a, b, threshold=60):
    return fuzz.token_sort_ratio(a, b) >= threshold


doc = fitz.open(pdf_path)

# append list based on sentences "." & if s.strip() condition check to remove empty sentence
sentences = [s.strip() for s in LLM_answer.replace("\n", "").split(".") if s.strip()]
if sentences[0] == "no": 
    print("(highlight.py) no highlight needed, exiting highlight.py now!", file=sys.stderr)
    print(json.dumps({
        "highlight_text" : ""
    }))
    sys.exit(0)

sentences = sentences[1:]

try:
    for page_num, page in enumerate(doc):
        blocks = page.get_text("blocks") # (x0, y0, x1, y1, "text", block_no, ...possibly more)
        
        for block in blocks:             # block is texts from original uploads, sentence is from LLM answers
            line_text = block[4]
            for sentence in sentences:
                if is_similar(sentence, line_text):
                    highlight_text.append(line_text)
                    rect = fitz.Rect(block[0:4])
                    page.add_highlight_annot(rect)
                    highlighted = True
                    break   # avoid double-highlighting the same block

    highlight_path = "./uploads/highlight.pdf"
    if highlighted:
        print("(highlight.py) We got Highlights!", file=sys.stderr)
        doc.save(highlight_path)
    else:
        print("(highlight.py) No Highlights!", file=sys.stderr)
        highlight_path = ""
    doc.close()

    # if you want to send data back to Node from Python, you must print() it
    print(json.dumps({
        "answer" : sentences,
        "highlight_text" : highlight_text
    }))

except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
