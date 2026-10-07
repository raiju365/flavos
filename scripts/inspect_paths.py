import xml.etree.ElementTree as ET

tree = ET.parse('public/signature.svg')
root = tree.getroot()
print("Root tag:", root.tag)
print("ViewBox:", root.attrib.get('viewBox'))

# Print all path elements
for i, elem in enumerate(root.iter()):
    if elem.tag.endswith('path'):
        print(f"Path #{i}: class={elem.attrib.get('class')}, id={elem.attrib.get('id')}, d={elem.attrib.get('d')[:60]}...")
