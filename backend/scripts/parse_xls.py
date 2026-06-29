import xlrd
import json
import argparse
import sys
import re
import unicodedata
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

def get_rgb(xf, book):
    """Returns (R, G, B) tuple for a given XF object's background color."""
    bg_color_index = xf.background.pattern_colour_index
    rgb = book.colour_map.get(bg_color_index)
    return rgb

def normalize_label(value):
    value = str(value).strip().lower()
    value = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in value if not unicodedata.combining(ch))

def find_week_date_row(sheet, start_col=4, end_col=56):
    best_row = 10
    best_count = 0

    for row_idx in range(min(sheet.nrows, 25)):
        date_count = 0
        for col_idx in range(start_col, min(end_col, sheet.ncols)):
            if sheet.cell(row_idx, col_idx).ctype == xlrd.XL_CELL_DATE:
                date_count += 1

        if date_count > best_count:
            best_row = row_idx
            best_count = date_count

    return best_row, best_count

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
    
    week_date_row, week_date_count = find_week_date_row(sheet)
    data_start_row = week_date_row + 1

    print(f"[parse_xls] Sheet '{sheet_name}': week_date_row={week_date_row}, dates_found={week_date_count}, data_start_row={data_start_row}, total_rows={sheet.nrows}", file=sys.stderr)

    week_dates = []
    for col in range(4, 56): # Cols 4-55 (52 weeks)
        cell = sheet.cell(week_date_row, col)
        if cell.ctype == xlrd.XL_CELL_DATE:
            dt = xlrd.xldate_as_datetime(cell.value, book.datemode)
            week_dates.append(dt.strftime("%Y-%m-%d"))
        else:
            # Fallback or error
            week_dates.append(None)

    unites = []
    for row_idx in range(data_start_row, sheet.nrows):
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
        # Use word-boundary regex for 'tiff' to avoid matching substrings in unit names
        if not unit_name:
            continue
        unit_lower = unit_name.lower()
        if any(skip in unit_lower for skip in ["vacance", "examen", "travaux individuels"]):
            continue
        if re.search(r'\btiff\b', unit_lower):
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
            is_global = False
            if isinstance(val, (int, float)) and val > 0:
                cell_type = "normal"
            elif rgb == (255, 255, 204):
                cell_type = "normal"
            elif rgb == (255, 255, 0):
                if isinstance(val, (int, float)) and val > 0:
                    cell_type = "normal"
                else:
                    cell_type = "tiff"
            elif rgb == (255, 153, 204):
                cell_type = "vacation"
                if "vacance" in str(val).lower():
                    is_global = True
            elif rgb == (192, 192, 192):
                cell_type = "exam"
                if "examen" in str(val).lower():
                    is_global = True
            elif "vacance" in str(val).lower():
                cell_type = "vacation"
                is_global = True
            elif "examen" in str(val).lower():
                cell_type = "exam"
                is_global = True
            
            if cell_type != "empty" or (isinstance(val, (int, float)) and val > 0):
                cells.append({
                    "week": col_idx - 3,
                    "type": cell_type,
                    "value": val if isinstance(val, (int, float)) else None,
                    "date": week_dates[col_idx - 4],
                    "is_global": is_global
                })

        unites.append({
            "ordre": row_idx,
            "num": unit_num,
            "nom": unit_name,
            "formateur": formateur,
            "vhg": vhg,
            "cells": cells
        })

<<<<<<< HEAD
    print(f"[parse_xls] Sheet '{sheet_name}': parsed {len(unites)} unité(s), {sum(len(u['cells']) for u in unites)} total cells", file=sys.stderr)
=======
    # BUG FIX 3: Broadcast 'exam' and 'vacation' cell_type to all units for weeks that are global
    # Identify which weeks have 'exam' or 'vacation' with the is_global flag
    global_weeks = {} # week -> type
    for u in unites:
        for c in u["cells"]:
            if c.get("is_global"):
                global_weeks[c["week"]] = c["type"]
    
    # Second pass: Ensure all units have the global type for those weeks, but DON'T overwrite values
    for u in unites:
        existing_weeks = {c["week"]: c for c in u["cells"]}
        for w, gtype in global_weeks.items():
            if w in existing_weeks:
                # Only overwrite if it doesn't have a numerical value or it's an evaluation of the same type
                if not existing_weeks[w]["value"]:
                    existing_weeks[w]["type"] = gtype
            else:
                # Add a new global cell if it didn't exist
                u["cells"].append({
                    "week": w,
                    "type": gtype,
                    "value": None,
                    "date": week_dates[w-1] if w <= len(week_dates) else None
                })
        # Sort cells by week
        u["cells"].sort(key=lambda x: x["week"])
>>>>>>> db1b912 (Refactor logigramme grid: extract XLS styles, fix global week broadcasts, and synchronize visual design)

    # Metadata extraction (Search first 10 rows)
    # Uses normalize_label (accent-safe) for all checks
    metadata = {
        "filiere": "",
        "niveau": "",
        "classe": "",
        "annee_acad": ""
    }
    
    for r in range(min(10, sheet.nrows)):
        for c in range(min(5, sheet.ncols)):
            try:
                val = str(sheet.cell(r, c).value).strip()
                if ":" not in val:
                    continue
                normalized_val = normalize_label(val)
                raw_value = val.split(":", 1)[1].strip()
                if "filiere:" in normalized_val:
                    metadata["filiere"] = raw_value
                elif "niveau:" in normalized_val:
                    metadata["niveau"] = raw_value
                elif "classe:" in normalized_val:
                    metadata["classe"] = raw_value
                elif "annee de formation:" in normalized_val or "annee academique:" in normalized_val:
                    metadata["annee_acad"] = raw_value
            except:
                pass

    print(f"[parse_xls] Sheet '{sheet_name}': metadata={json.dumps(metadata, ensure_ascii=False)}", file=sys.stderr)
    if not metadata["filiere"] or not metadata["classe"]:
        print(f"[parse_xls] ⚠ WARNING: Missing filiere or classe metadata for sheet '{sheet_name}'!", file=sys.stderr)

    return {
        "metadata": metadata,
        "unites": unites,
        "weeks": week_dates,
        "debug": {
            "week_date_row": week_date_row,
            "week_date_count": week_date_count,
            "data_start_row": data_start_row
        }
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
