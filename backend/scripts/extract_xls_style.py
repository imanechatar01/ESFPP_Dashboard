import xlrd
import json
import os

def get_rgb(colour_index, book):
    rgb = book.colour_map.get(colour_index)
    if rgb:
        return '#{:02x}{:02x}{:02x}'.format(*rgb)
    return None

def extract_style(file_path, sheet_name):
    book = xlrd.open_workbook(file_path, formatting_info=True)
    sheet = book.sheet_by_name(sheet_name)
    
    spec = {
        "columns": {},
        "rows": {},
        "fonts": {},
        "colors": {
            "backgrounds": {},
            "text": {}
        },
        "borders": {}
    }

    # 1. Column Widths (Cols 0 to 56)
    for col in range(57):
        try:
            # Use colinfo_map if available, else fallback to 2962 (standard)
            width = sheet.colinfo_map[col].width if col in sheet.colinfo_map else 2962
            spec["columns"][col] = {
                "raw": width,
                "px": round(width / 256 * 7.5)
            }
        except:
            spec["columns"][col] = {"raw": 2962, "px": 87}

    # 2. Row Heights
    for row in range(12):
        try:
            height = sheet.rowinfo_map[row].height if row in sheet.rowinfo_map else 255
            spec["rows"][row] = {
                "raw": height,
                "px": round(height / 20)
            }
        except:
            spec["rows"][row] = {"raw": 255, "px": 13}

    # 3. Style Samples
    # We'll sample specific cells to get fonts/colors
    samples = {
        "header_semester": (7, 4), # Row 8 (Semestre 1)
        "header_month": (8, 4),    # Row 9 (Septembre)
        "header_week_num": (9, 4), # Row 10 (1)
        "header_date": (10, 4),    # Row 11 (01/09)
        "unit_num": (11, 0),
        "unit_name": (11, 1),
        "formateur": (11, 2),
        "vhg": (11, 3),
        "cell_normal": (11, 12), # Week 9 (usually has a value)
        "cell_vacation": None,
        "cell_exam": None,
        "cell_tiff": None
    }
    
    # Find vacation/exam/tiff samples
    for r in range(11, sheet.nrows):
        for c in range(4, 56):
            cell = sheet.cell(r, c)
            xf = book.xf_list[cell.xf_index]
            bg_rgb = get_rgb(xf.background.pattern_colour_index, book)
            
            if bg_rgb == '#ff99cc' and not samples["cell_vacation"]:
                samples["cell_vacation"] = (r, c)
            elif bg_rgb == '#c0c0c0' and not samples["cell_exam"]:
                samples["cell_exam"] = (r, c)
            elif bg_rgb == '#ffff00' and not samples["cell_tiff"]:
                samples["cell_tiff"] = (r, c)
                
    for key, pos in samples.items():
        if not pos: continue
        r, c = pos
        cell = sheet.cell(r, c)
        xf = book.xf_list[cell.xf_index]
        font = book.font_list[xf.font_index]
        
        bg_color = get_rgb(xf.background.pattern_colour_index, book)
        text_color = get_rgb(font.colour_index, book)
        
        spec["fonts"][key] = {
            "name": font.name,
            "size": font.height / 20, # points
            "bold": font.bold == 1,
            "italic": font.italic == 1,
            "color": text_color
        }
        
        if bg_color:
            spec["colors"]["backgrounds"][key] = bg_color

        # Border sample (using bottom border of the cell as reference)
        spec["borders"][key] = {
            "bottom": {
                "width": xf.border.bottom_line_style,
                "color": get_rgb(xf.border.bottom_colour_index, book)
            },
            "left": {
                "width": xf.border.left_line_style,
                "color": get_rgb(xf.border.left_colour_index, book)
            }
        }

    return spec

if __name__ == "__main__":
    file_path = "/home/pirkin1043/Downloads/Stage d'initiation/OK Nidal Etat logigramme -aide soignant classeur de jury 2025-2026.xls"
    sheet_name = "Aide-soignant"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        exit(1)
        
    style_spec = extract_style(file_path, sheet_name)
    
    os.makedirs("docs", exist_ok=True)
    with open("docs/xls-style-spec.json", "w") as f:
        json.dump(style_spec, f, indent=2)
    
    print("Style spec extracted to docs/xls-style-spec.json")
