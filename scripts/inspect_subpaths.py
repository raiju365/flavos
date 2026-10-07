import xml.etree.ElementTree as ET
import re

tree = ET.parse('public/signature.svg')
root = tree.getroot()
paths = []
for elem in root.iter():
    if elem.tag.endswith('path') and 'd' in elem.attrib:
        paths.append(elem.attrib['d'])

main_path = paths[0]
subpaths = re.split(r'(?=[Mm])', main_path)
subpaths = [s.strip() for s in subpaths if s.strip()]

print(f"Total subpaths: {len(subpaths)}")
for i, sp in enumerate(subpaths):
    # extract first coordinate
    first_coord = sp[:30]
    print(f"Subpath {i}: length {len(sp)}, starts: {first_coord}")
