import sys

def parse_tags(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Just search for "<div" and "</div"
    # Or just count them
    div_opens = content.count("<div")
    div_closes = content.count("</div")
    print(f"<div count: {div_opens}, </div count: {div_closes}")
    return div_opens, div_closes

if __name__ == '__main__':
    parse_tags('src/components/MISReport.tsx')
