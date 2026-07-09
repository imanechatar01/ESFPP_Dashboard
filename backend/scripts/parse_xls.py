"""
parse_xls.py  –  ESFPP Dashboard XLS parser (xlrd, .xls only)
==============================================================
Single-pass parser with:
  • Dynamic anchor detection for the header row (scans first 15 rows for
    "Unités de formation" + "Formateur" / "VHG" — no hard-coded row numbers).
  • Perceptual colour clustering: Euclidean distance in RGB space maps
    the raw colour palette to 5 semantic types (normal / vacation / exam /
    tiff / empty), tolerating "human noise" (multiple near-identical shades
    mapped to the same bucket).
  • Priority hierarchy: column-override → cell text → numeric value → colour.
  • Merged-cell forward-fill for Formateur/VHG columns (never overwrites
    an explicitly non-empty cell).
  • is_valid_logigramme_sheet preserved (excludes Feuil1 etc.).
  • --dry-run prints colour stats (raw distinct + post-clustering) per sheet.
  • Total parse time logged.

Colour reference anchors (derived from frontend logigramme-helpers.js):
  normal   #FEF9C3  → RGB(254, 249, 195)
  vacation #F472B6  → RGB(244, 114, 182)
  exam     slate-200 → RGB(192, 192, 192)  (also darker grays)
  tiff     yellow-400 → RGB(250, 204, 21)  (and bright yellows)
  empty    white / no-fill
"""

import xlrd
import json
import argparse
import sys
import re
import unicodedata
import time
import math
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------------------
# COLOUR CLUSTERING
# ---------------------------------------------------------------------------
# Semantic anchor colours (RGB) derived from frontend logigramme-helpers.js.
# Each entry is (R, G, B, max_distance_threshold).
# A raw colour is assigned to the first bucket whose Euclidean distance is ≤
# the threshold.  Order matters: more specific anchors first.
COLOUR_ANCHORS = [
    # type       R    G    B   threshold
    ("vacation", 244, 114, 182, 60),   # #F472B6 pink / hot-pink family
    ("vacation", 255, 153, 204, 55),   # legacy pink used in existing files
    ("exam",     192, 192, 192, 50),   # slate-200 / standard gray
    ("exam",     150, 150, 150, 45),   # darker gray variant
    ("tiff",     250, 204,  21, 60),   # yellow-400  (bright yellow family)
    ("tiff",     255, 255,   0, 50),   # pure bright yellow
    ("normal",   254, 249, 195, 55),   # #FEF9C3 pale yellow (normal session)
    ("normal",   255, 255, 204, 50),   # #FFFFCC near-white yellow variant
    ("normal",   255, 255, 153, 55),   # #FFFF99 slightly deeper yellow
    ("normal",   204, 255, 204, 60),   # #CCFFCC pale green (also used for normal in some files)
    ("normal",   187, 247, 208, 55),   # #BBF7D0 green-done state (treat as normal at parse time)
]

# Colours considered "no fill" — classified as empty without warning.
EMPTY_RGB_EXACT = {
    (255, 255, 255),  # white
    (0,   0,   0),    # black (rare border artefact)
}
EMPTY_INDEX = 64  # xlrd pattern_colour_index for "automatic / no fill"


def _rgb_distance(rgb, r2, g2, b2):
    """Euclidean distance in RGB space between two colours."""
    return math.sqrt(
        (rgb[0] - r2) ** 2 +
        (rgb[1] - g2) ** 2 +
        (rgb[2] - b2) ** 2
    )


def classify_colour(rgb, bg_index):
    """
    Map an RGB tuple to a semantic cell type string or None (meaning 'empty').

    Returns:
        (str | None, bool recognised)
        type: 'normal' | 'vacation' | 'exam' | 'tiff' | None
        recognised: True if matched a known anchor; False → caller should warn.
    """
    if rgb is None or bg_index == EMPTY_INDEX or rgb in EMPTY_RGB_EXACT:
        return None, True   # empty, no warning needed

    # Try perceptual match against anchors
    best_type = None
    best_dist = float("inf")
    for anchor in COLOUR_ANCHORS:
        atype, ar, ag, ab, thresh = anchor
        d = _rgb_distance(rgb, ar, ag, ab)
        if d <= thresh and d < best_dist:
            best_dist = d
            best_type = atype

    if best_type is not None:
        return best_type, True

    return None, False  # unrecognised — caller emits warning


# ---------------------------------------------------------------------------
# NORMALISATION HELPERS
# ---------------------------------------------------------------------------
def normalize_label(value):
    value = str(value).strip().lower()
    value = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in value if not unicodedata.combining(ch))


def check_keyword(val_str, keywords):
    normalized = normalize_label(val_str)
    return any(k in normalized for k in keywords)


# ---------------------------------------------------------------------------
# SHEET VALIDATION (preserved from original)
# ---------------------------------------------------------------------------
def is_valid_logigramme_sheet(sheet):
    if sheet.ncols < 50:
        return False, f"ncols={sheet.ncols} < 50"

    found_header = False
    for r in range(min(10, sheet.nrows)):
        for c in range(min(10, sheet.ncols)):
            try:
                val = str(sheet.cell(r, c).value)
                normalized = normalize_label(val)
                if "filiere" in normalized or "unites de formation" in normalized:
                    found_header = True
                    break
            except Exception:
                pass
        if found_header:
            break

    if not found_header:
        return False, "Filière: or Unités de formation not found in first 10 rows/cols"

    return True, ""


# ---------------------------------------------------------------------------
# DYNAMIC ANCHOR DETECTION
# ---------------------------------------------------------------------------
def find_header_anchor(sheet):
    """
    Scan the first 15 rows and locate:
      1. header_row  – row that contains 'Unités de formation' AND ('Formateur' OR 'VHG')
      2. week_date_row – row with the most XL_CELL_DATE cells in cols 4-55
      3. data_start_row = max(header_row, week_date_row) + 1

    Returns (header_row, week_date_row, data_start_row, dates_found).
    Falls back to week_date_row-only logic if header row cannot be pinpointed.
    """
    scan_limit = min(15, sheet.nrows)

    # --- find header row (column label row) ---
    header_row = -1
    for r in range(scan_limit):
        row_text = " ".join(
            normalize_label(sheet.cell(r, c).value)
            for c in range(min(8, sheet.ncols))
        )
        has_unite = "unite" in row_text or "formation" in row_text
        has_formateur = "formateur" in row_text or "formtr" in row_text
        has_vhg = "vhg" in row_text or "volume" in row_text
        if has_unite and (has_formateur or has_vhg):
            header_row = r
            break

    # --- find week-date row ---
    best_row = max(header_row, 0)
    best_count = 0
    for row_idx in range(scan_limit):
        date_count = sum(
            1 for col_idx in range(4, min(56, sheet.ncols))
            if sheet.cell(row_idx, col_idx).ctype == xlrd.XL_CELL_DATE
        )
        if date_count > best_count:
            best_row = row_idx
            best_count = date_count

    week_date_row = best_row
    dates_found = best_count

    # data starts the row after the last of the two anchor rows
    data_start_row = max(header_row, week_date_row) + 1

    return header_row, week_date_row, data_start_row, dates_found


# ---------------------------------------------------------------------------
# MERGED-CELL FORWARD-FILL HELPER
# ---------------------------------------------------------------------------
def build_merged_map(sheet):
    """
    Return a dict {(row, col): (row_lo, col_lo)} mapping every cell inside a
    merged range back to the top-left (origin) cell of that range.
    Only relevant for sheets that expose merged_cells (xlrd ≥ 0.7).
    """
    merged = {}
    try:
        for (rlo, rhi, clo, chi) in sheet.merged_cells:
            for r in range(rlo, rhi):
                for c in range(clo, chi):
                    merged[(r, c)] = (rlo, clo)
    except AttributeError:
        pass  # older xlrd or no merges
    return merged


def get_cell_value_with_fill(sheet, merged_map, row, col, fill_state: dict):
    """
    Return cell value, honouring:
      1. Explicit non-empty value in the cell itself.
      2. If cell is inside a merged region, use the origin cell's value.
      3. If cell is empty, fall back to fill_state[col] (forward-fill from above).
    Never overwrites an explicitly non-empty cell.
    """
    origin = merged_map.get((row, col), (row, col))
    cell = sheet.cell(origin[0], origin[1])
    val = cell.value
    if cell.ctype not in (xlrd.XL_CELL_EMPTY, xlrd.XL_CELL_BLANK):
        fill_state[col] = val
        return val
    # fall through to forward-fill
    return fill_state.get(col, "")


# ---------------------------------------------------------------------------
# MAIN PARSE FUNCTION
# ---------------------------------------------------------------------------
def parse_xls(file_path, sheet_name, book=None):
    """
    Parse a single sheet from an already-opened workbook (book) or open it.
    Returns the payload dict or None on hard failure.
    """
    t0 = time.perf_counter()

    try:
        if book is None:
            book = xlrd.open_workbook(file_path, formatting_info=True)
    except Exception as e:
        print(f"Error opening workbook: {e}", file=sys.stderr)
        return None

    try:
        sheet = book.sheet_by_name(sheet_name)
    except Exception as e:
        print(f"Error finding sheet '{sheet_name}': {e}", file=sys.stderr)
        return None

    is_valid, reason = is_valid_logigramme_sheet(sheet)
    if not is_valid:
        print(f"Skipping invalid logigramme sheet '{sheet_name}': {reason}", file=sys.stderr)
        return None

    # --- dynamic anchor detection ---
    header_row, week_date_row, data_start_row, dates_found = find_header_anchor(sheet)

    print(
        f"[parse_xls] Sheet '{sheet_name}': header_row={header_row}, "
        f"week_date_row={week_date_row}, dates_found={dates_found}, "
        f"data_start_row={data_start_row}, total_rows={sheet.nrows}",
        file=sys.stderr,
    )

    # --- extract week dates ---
    week_dates = []
    for col in range(4, 56):
        if col < sheet.ncols:
            cell = sheet.cell(week_date_row, col)
            if cell.ctype == xlrd.XL_CELL_DATE:
                dt = xlrd.xldate_as_datetime(cell.value, book.datemode)
                week_dates.append(dt.strftime("%Y-%m-%d"))
            else:
                week_dates.append(None)
        else:
            week_dates.append(None)

    # --- merged-cell map for formateur/VHG forward-fill ---
    merged_map = build_merged_map(sheet)
    formateur_fill: dict = {}
    vhg_fill: dict = {}

    # --- pre-scan columns for column-level overrides (Exam/Vacation) ---
    # Colour inventory for dry-run reporting
    raw_colours_seen: set = set()

    column_overrides: dict = {}
    for col_idx in range(4, min(56, sheet.ncols)):
        has_vacation_text = False
        has_exam_text = False
        has_tiff_text = False
        pink_count = 0
        gray_count = 0
        valid_rows_count = 0

        for r in range(data_start_row, sheet.nrows):
            unit_num_cell = sheet.cell(r, 0)
            unit_name_cell = sheet.cell(r, 1)
            if (unit_num_cell.ctype == xlrd.XL_CELL_EMPTY and
                    unit_name_cell.ctype == xlrd.XL_CELL_EMPTY):
                continue
            if "total" in normalize_label(str(sheet.cell(r, 2).value)):
                break

            valid_rows_count += 1
            cell = sheet.cell(r, col_idx)
            val_str = str(cell.value).strip()

            if check_keyword(val_str, ["vacance"]):
                has_vacation_text = True
            elif check_keyword(val_str, ["examen", "semaine d'examen", "semaine exam"]):
                has_exam_text = True
            elif check_keyword(val_str, ["tif", "travaux individ"]):
                has_tiff_text = True

            xf = book.xf_list[cell.xf_index]
            bg_idx = xf.background.pattern_colour_index
            rgb = book.colour_map.get(bg_idx)
            if rgb is not None and bg_idx != EMPTY_INDEX and rgb not in EMPTY_RGB_EXACT:
                raw_colours_seen.add(rgb)
                sem_type, _ = classify_colour(rgb, bg_idx)
                if sem_type == "vacation":
                    pink_count += 1
                elif sem_type == "exam":
                    gray_count += 1

        if has_vacation_text:
            column_overrides[col_idx] = "vacation"
        elif has_exam_text:
            column_overrides[col_idx] = "exam"
        elif has_tiff_text:
            column_overrides[col_idx] = "tiff"
        elif valid_rows_count > 0:
            if pink_count > (valid_rows_count / 2):
                column_overrides[col_idx] = "vacation"
            elif gray_count > (valid_rows_count / 2):
                column_overrides[col_idx] = "exam"

    # --- parse data rows ---
    unites = []
    warnings = []

    for row_idx in range(data_start_row, sheet.nrows):
        unit_num_cell = sheet.cell(row_idx, 0)
        unit_name_cell = sheet.cell(row_idx, 1)

        if (unit_num_cell.ctype == xlrd.XL_CELL_EMPTY and
                unit_name_cell.ctype == xlrd.XL_CELL_EMPTY):
            continue

        summary_val = normalize_label(str(sheet.cell(row_idx, 2).value))
        if "total" in summary_val:
            break

        try:
            unit_num = int(float(unit_num_cell.value))
        except Exception:
            unit_num = 0

        unit_name = str(unit_name_cell.value).strip()
        if not unit_name:
            continue

        unit_lower = unit_name.lower()
        if any(skip in unit_lower for skip in ["vacance", "examen", "travaux individuels"]):
            continue
        if re.search(r'\btiff?\b', unit_lower):
            continue

        # Formateur with merged-cell forward-fill (col 2)
        formateur = str(
            get_cell_value_with_fill(sheet, merged_map, row_idx, 2, formateur_fill)
        ).strip()

        # VHG with merged-cell forward-fill (col 3)
        raw_vhg = get_cell_value_with_fill(sheet, merged_map, row_idx, 3, vhg_fill)
        try:
            vhg = float(raw_vhg)
        except Exception:
            vhg = 0.0

        cells = []
        for col_idx in range(4, min(56, sheet.ncols)):
            cell = sheet.cell(row_idx, col_idx)
            xf = book.xf_list[cell.xf_index]
            bg_idx = xf.background.pattern_colour_index
            rgb = book.colour_map.get(bg_idx)

            val = cell.value
            val_str = str(val).strip()

            if rgb is not None and bg_idx != EMPTY_INDEX and rgb not in EMPTY_RGB_EXACT:
                raw_colours_seen.add(rgb)

            # ----------------------------------------------------------------
            # PRIORITY HIERARCHY
            # ----------------------------------------------------------------
            # 1. Column-level override
            if col_idx in column_overrides:
                cell_type = column_overrides[col_idx]

            # 2. Cell text — strongest per-cell signal
            elif check_keyword(val_str, ["vacance"]):
                cell_type = "vacation"
            elif check_keyword(val_str, ["examen", "semaine d'examen", "semaine exam"]):
                cell_type = "exam"
            elif check_keyword(val_str, ["tif", "travaux individ"]):
                cell_type = "tiff"

            # 3. Positive numeric → normal session (regardless of colour)
            # val == 0 falls through to colour-based classification below
            elif isinstance(val, (int, float)) and val > 0:
                cell_type = "normal"

            # 4. Colour-based classification
            else:
                sem_type, recognised = classify_colour(rgb, bg_idx)
                if sem_type is not None:
                    cell_type = sem_type
                elif not recognised:
                    # Unrecognised colour on an empty/zero cell → warn, don't crash
                    warning_msg = (
                        f"WARNING: [{sheet_name}] row {row_idx}, col {col_idx} "
                        f"({unit_name}): Unrecognized color {rgb} for empty/zero cell. "
                        f"Defaulting to 'empty'."
                    )
                    print(warning_msg, file=sys.stderr)
                    warnings.append({
                        "sheet": sheet_name,
                        "row": row_idx,
                        "col": col_idx,
                        "module": unit_name,
                        "rgb": list(rgb) if rgb else None,
                        "message": warning_msg,
                    })
                    cell_type = "empty"
                else:
                    cell_type = "empty"

            # Append non-empty cells.
            # For 'normal' type: only store if value is a positive number.
            # For other types (vacation/exam/tiff): always store.
            skip = False
            if cell_type == "empty":
                skip = True
            elif cell_type == "normal" and not (isinstance(val, (int, float)) and val > 0):
                # Colour-matched as 'normal' but has no positive numeric value — treat as empty
                skip = True

            if not skip:
                week_idx = col_idx - 4  # 0-based index into week_dates
                numeric_value = val if isinstance(val, (int, float)) and val > 0 else None
                cells.append({
                    "week": col_idx - 3,  # 1-based week number for API compat
                    "type": cell_type,
                    "value": numeric_value,
                    "date": week_dates[week_idx] if week_idx < len(week_dates) else None,
                })

        unites.append({
            "ordre": row_idx,
            "num": unit_num,
            "nom": unit_name,
            "formateur": formateur,
            "vhg": vhg,
            "cells": cells,
        })

    elapsed = time.perf_counter() - t0
    total_cells = sum(len(u["cells"]) for u in unites)
    print(
        f"[parse_xls] Sheet '{sheet_name}': parsed {len(unites)} unité(s), "
        f"{total_cells} total cells in {elapsed:.3f}s",
        file=sys.stderr,
    )

    # --- metadata extraction ---
    metadata = {"filiere": "", "niveau": "", "classe": "", "annee_acad": ""}
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
            except Exception:
                pass

    return {
        "metadata": metadata,
        "unites": unites,
        "weeks": week_dates,
        "warnings": warnings,
        "debug": {
            "header_row": header_row,
            "week_date_row": week_date_row,
            "week_date_count": dates_found,
            "data_start_row": data_start_row,
            "parse_seconds": round(elapsed, 4),
            "raw_colours_count": len(raw_colours_seen),
        },
    }


# ---------------------------------------------------------------------------
# COLOUR AUDIT HELPER (for --dry-run)
# ---------------------------------------------------------------------------
def audit_colours(raw_colours: set):
    """
    Group raw colours into semantic clusters.
    Returns: {type: [list_of_rgb]}, unrecognised_list
    """
    clusters: dict = {
        "normal": [], "vacation": [], "exam": [], "tiff": [], "unrecognised": []
    }
    for rgb in raw_colours:
        sem, recognised = classify_colour(rgb, -1)   # bg_index -1 → not EMPTY_INDEX
        if recognised and sem is not None:
            clusters[sem].append(rgb)
        else:
            clusters["unrecognised"].append(rgb)
    return clusters


# ---------------------------------------------------------------------------
# CLI ENTRY POINT
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ESFPP XLS logigramme parser")
    parser.add_argument("--file", required=True, help="Path to the .xls file")
    parser.add_argument("--sheet", help="Sheet name to parse (single sheet mode)")
    parser.add_argument("--list-sheets", action="store_true", help="List valid sheet names as JSON")
    parser.add_argument("--dry-run", action="store_true", help="Audit all sheets without persisting")
    args = parser.parse_args()

    if args.list_sheets:
        try:
            book = xlrd.open_workbook(args.file, on_demand=True)
            valid_sheets = []
            for sheet_name in book.sheet_names():
                sheet = book.sheet_by_name(sheet_name)
                is_valid, reason = is_valid_logigramme_sheet(sheet)
                if is_valid:
                    valid_sheets.append(sheet_name)
                else:
                    print(f"Skipping recap/utility sheet '{sheet_name}': {reason}", file=sys.stderr)
            print(json.dumps(valid_sheets))
        except Exception as e:
            print(f"Error listing sheets: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.dry_run:
        t_total = time.perf_counter()
        try:
            # Single-pass: open once with formatting_info
            book = xlrd.open_workbook(args.file, formatting_info=True)
        except Exception as e:
            print(f"Dry-run error opening file: {e}", file=sys.stderr)
            sys.exit(1)

        all_raw_colours: set = set()

        for sheet_name in book.sheet_names():
            sheet = book.sheet_by_name(sheet_name)
            is_valid, reason = is_valid_logigramme_sheet(sheet)
            if not is_valid:
                print(f"\nSkipping sheet '{sheet_name}': {reason}", file=sys.stderr)
                continue

            print(f"\n{'='*60}")
            print(f"  Dry-run parsing sheet: {sheet_name}")
            print(f"{'='*60}")

            try:
                data = parse_xls(args.file, sheet_name, book=book)
            except Exception as ex:
                print(f"  !! ERROR parsing '{sheet_name}': {ex}", file=sys.stderr)
                continue

            if not data:
                print(f"  Failed to parse sheet: {sheet_name}")
                continue

            dbg = data.get("debug", {})
            print(f"  header_row      : {dbg.get('header_row')}")
            print(f"  week_date_row   : {dbg.get('week_date_row')}  (dates found: {dbg.get('week_date_count')})")
            print(f"  data_start_row  : {dbg.get('data_start_row')}")
            print(f"  total_rows sheet: —")
            print(f"  parse time      : {dbg.get('parse_seconds')}s")

            # Cell type counts
            counts = {"normal": 0, "vacation": 0, "exam": 0, "tiff": 0, "empty": 0, "unknown": 0}
            for u in data["unites"]:
                for c in u["cells"]:
                    t = c["type"]
                    if t in counts:
                        counts[t] += 1
                    else:
                        counts["unknown"] += 1

            print(f"\n  Summary for '{sheet_name}':")
            print(f"    Total Units   : {len(data['unites'])}")
            print(f"    Classified cells:")
            for k, v in counts.items():
                print(f"      {k:12s}: {v}")

            # Colour audit
            raw_count = dbg.get("raw_colours_count", 0)
            # Rebuild raw colours from debug (we stored count only); re-collect from data
            # (We can reconstruct a rough set from data warnings and normal cells)
            # For the audit, collect from raw_colours_seen via a local re-scan
            # Re-use the debug raw_colours_count; do a live audit via re-scan of sheet
            raw_colours_sheet: set = set()
            for r in range(min(15, sheet.nrows), sheet.nrows):
                for c in range(4, min(56, sheet.ncols)):
                    xf = book.xf_list[sheet.cell(r, c).xf_index]
                    bg_idx = xf.background.pattern_colour_index
                    rgb = book.colour_map.get(bg_idx)
                    if rgb is not None and bg_idx != EMPTY_INDEX and rgb not in EMPTY_RGB_EXACT:
                        raw_colours_sheet.add(rgb)
            all_raw_colours.update(raw_colours_sheet)

            clusters = audit_colours(raw_colours_sheet)
            print(f"\n  Colour audit:")
            print(f"    Raw distinct colours before clustering : {len(raw_colours_sheet)}")
            sem_total = sum(len(v) for v in clusters.values())
            print(f"    Semantic clusters after clustering     : {sum(1 for v in clusters.values() if v)} (of 5 types)")
            for ctype, clist in clusters.items():
                if clist:
                    print(f"      {ctype:14s}: {len(clist)} raw colours → {[c for c in clist[:5]]}{'...' if len(clist) > 5 else ''}")

            print(f"\n  Warnings: {len(data.get('warnings', []))}")
            for w in data.get("warnings", []):
                print(f"    - Row {w['row']}, Col {w['col']}: {w['message']}")

        elapsed_total = time.perf_counter() - t_total
        print(f"\n{'='*60}")
        print(f"  TOTAL parse time across all sheets: {elapsed_total:.3f}s")
        print(f"  Total distinct colours (all sheets): {len(all_raw_colours)}")
        print(f"{'='*60}")

    elif args.sheet:
        data = parse_xls(args.file, args.sheet)
        if data:
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            sys.exit(1)
    else:
        print("Either --sheet, --dry-run or --list-sheets is required", file=sys.stderr)
        sys.exit(1)
