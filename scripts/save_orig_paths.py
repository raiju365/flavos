import json
import xml.etree.ElementTree as ET

tree = ET.parse('public/signature.svg')
root = tree.getroot()
orig_paths = [e.attrib['d'] for e in root.iter() if e.tag.endswith('path') and 'd' in e.attrib]

with open('scripts/orig_paths.json', 'w') as f:
    json.dump(orig_paths, f)
print("Saved orig_paths.json")
