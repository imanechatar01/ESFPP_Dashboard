import xlrd
import json
import argparse
import sys
from datetime import datetime

def get_rgb(xf, book):
    """Returns (R, G, B) tuple for a given XF object's background color."""
    bg_color_index = xf.background.pattern_colour_index
    rgb = book.colour_map.get(bg_color_index)
    return rgb

def parse_xls(file_path, sheet_name):
    try:
        # formatting_info=True is essential for background colors in .xls files
        book = xlrd.open_workbook(file_path, formatting_info=True)
    except Exception as e:
        print(f"Error opening workbook: {e}", file=sys.stderr)
        return None

    try:
        sheet = book.sheet_by_name(sheet_name)
    except Exception as e:
        print(f"Error finding sheet '{sheet_name}': {e}", file=sys.stderr)
        return None

    # Metadata extraction (Rows 2-6 as per MASTER.md)
    # Note: Excel rows are 0-indexed. MASTER.md says Rows 0-6 are metadata.
    # Let's adjust to be robust. Usually unit rows start around 11.
    
    # We'll use the structure defined in MASTER.md:
    # Row 10 (index 10): Week start dates
    # Rows 11+ (index 11+): Data rows
    
    week_dates = []
    for col in range(4, 56): # Cols 4-55 (52 weeks)
        cell = sheet.cell(10, col)
        if cell.ctype == xlrd.XL_CELL_DATE:
            dt = xlrd.xldate_as_datetime(cell.value, book.datemode)
            week_dates.append(dt.strftime("%Y-%m-%d"))
        else:
            # Fallback or error
            week_dates.append(None)

    unites = []
    for row_idx in range(11, sheet.nrows):
        # Stop at 'Total' in col 2 or if col 0 is empty
        unit_num_cell = sheet.cell(row_idx, 0)
        unit_name_cell = sheet.cell(row_idx, 1)
        
        if unit_num_cell.ctype == xlrd.XL_CELL_EMPTY and unit_name_cell.ctype == xlrd.XL_CELL_EMPTY:
            continue
            
        if "total" in str(sheet.cell(row_idx, 2).value).lower():
            break

        try:
            unit_num = int(float(unit_num_cell.value))
        except:
            unit_num = 0
            
        unit_name = str(unit_name_cell.value).strip()
        
        # Skip empty rows or structural rows that aren't real units
        if not unit_name or any(skip in unit_name.lower() for skip in ["vacance", "examen", "travaux individuels", "tiff"]):
            continue

        formateur = str(sheet.cell(row_idx, 2).value).strip()
        
        try:
            vhg = float(sheet.cell(row_idx, 3).value)
        except:
            vhg = 0.0

        cells = []
        for col_idx in range(4, 56):
            cell = sheet.cell(row_idx, col_idx)
            xf = book.xf_list[cell.xf_index]
            rgb = get_rgb(xf, book)
            
            cell_type = "empty"
            val = cell.value
            
            # Map colors to types
            # (255, 255, 204) - Light Yellow (Normal)
            # (255, 255, 0)   - Bright Yellow (TIFF or Normal with value)
            # (255, 153, 204) - Pink (Vacation)
            # (192, 192, 192) - Gray (Exam)
            
            if rgb == (255, 255, 204):
                cell_type = "normal"
            elif rgb == (255, 255, 0):
                if isinstance(val, (int, float)) and val > 0:
                    cell_type = "normal" # Last session marker
                else:
                    cell_type = "tiff"
            elif rgb == (255, 153, 204):
                cell_type = "vacation"
            elif rgb == (192, 192, 192):
                cell_type = "exam"
            elif isinstance(val, (int, float)) and val > 0:
                cell_type = "normal"
            elif str(val).lower().strip() == "vacance":
                cell_type = "vacation"
            
            if cell_type != "empty" or (isinstance(val, (int, float)) and val > 0):
                cells.append({
                    "week": col_idx - 3,
                    "type": cell_type,
                    "value": val if isinstance(val, (int, float)) else None,
                    "date": week_dates[col_idx - 4]
                })

        unites.append({
            "ordre": row_idx,
            "num": unit_num,
            "nom": unit_name,
            "formateur": formateur,
            "vhg": vhg,
            "cells": cells
        })

    # Metadata extraction (Search first 10 rows)
    metadata = {
        "filiere": "",
        "niveau": "",
        "classe": "",
        "annee_acad": ""
    }
    
    for r in range(10):
        for c in range(5):
            try:
                val = str(sheet.cell(r, c).value).strip()
                if "filière:" in val.lower():
                    metadata["filiere"] = val.split(":", 1)[1].strip()
                elif "niveau:" in val.lower():
                    metadata["niveau"] = val.split(":", 1)[1].strip()
                elif "classe:" in val.lower():
                    metadata["classe"] = val.split(":", 1)[1].strip()
                elif "année de formation:" in val.lower():
                    metadata["annee_acad"] = val.split(":", 1)[1].strip()
                elif "année académique:" in val.lower():
                    metadata["annee_acad"] = val.split(":", 1)[1].strip()
            except:
                pass

    return {
        "metadata": metadata,
        "unites": unites,
        "weeks": week_dates
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--sheet")
    parser.add_argument("--list-sheets", action="store_true")
    args = parser.parse_args()

    if args.list_sheets:
        try:
            book = xlrd.open_workbook(args.file, on_demand=True)
            print(json.dumps(book.sheet_names()))
        except Exception as e:
            print(f"Error listing sheets: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.sheet:
        data = parse_xls(args.file, args.sheet)
        if data:
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            sys.exit(1)
    else:
        print("Either --sheet or --list-sheets is required", file=sys.stderr)
        sys.exit(1)
