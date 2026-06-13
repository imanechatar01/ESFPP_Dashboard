import xlrd
import os

def get_stats(file_path):
    book = xlrd.open_workbook(file_path, formatting_info=True)
    results = []
    for sheet_name in book.sheet_names():
        if sheet_name == 'Feuil1': continue
        sheet = book.sheet_by_name(sheet_name)
        units_count = 0
        total_vhg = 0
        
        # Structure from parse_xls.py
        for row_idx in range(11, sheet.nrows):
            unit_num_cell = sheet.cell(row_idx, 0)
            unit_name_cell = sheet.cell(row_idx, 1)
            
            if unit_num_cell.ctype == xlrd.XL_CELL_EMPTY and unit_name_cell.ctype == xlrd.XL_CELL_EMPTY:
                continue
                
            if "total" in str(sheet.cell(row_idx, 2).value).lower():
                break
                
            units_count += 1
            try:
                total_vhg += float(sheet.cell(row_idx, 3).value)
            except:
                pass
        
        results.append({
            "sheet": sheet_name,
            "units": units_count,
            "vhg": total_vhg
        })
    return results

xls_dir = "backend/xls-files"
files = [f for f in os.listdir(xls_dir) if f.endswith('.xls')]

for file in files:
    print(f"File: {file}")
    stats = get_stats(os.path.join(xls_dir, file))
    for s in stats:
        print(f"  {s['sheet']}: Units={s['units']}, TotalVHG={s['vhg']}")
