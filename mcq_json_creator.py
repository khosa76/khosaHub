import json
import re
import os

# Priority 1: Check for 'rawmcq.html'. Priority 2: Fall back to 'mcq.txt'
input_file = ''
if os.path.exists('rawmcq.html'):
    input_file = 'rawmcq.html'
elif os.path.exists('mcq.txt'):
    input_file = 'mcq.txt'
else:
    print("Error: Neither 'rawmcq.html' nor 'mcq.txt' was found in the current directory.")
    input_file = None

raw_data = ""
if input_file:
    try:
        with open(input_file, 'r', encoding='utf-8', errors='ignore') as file:
            raw_data = file.read()
    except Exception as e:
        print(f"Error reading file '{input_file}': {e}")

def clean_invalid_escapes(s):
    # Match valid escapes first, else match raw backslashes and replace with double backslash
    pattern = re.compile(r'\\([\"\\\/bfnrt]|u[0-9a-fA-F]{4})|\\')
    
    def replace(match):
        if match.group(1):
            return match.group(0)
        return '\\\\'
        
    return pattern.sub(replace, s)

def find_quiz_str(obj):
    # Recursively traverse nested arrays/dicts to find the string starting with {"quiz"
    if isinstance(obj, str):
        s_clean = obj.strip()
        if s_clean.startswith('{') and '"quiz"' in s_clean:
            return obj
    elif isinstance(obj, list):
        for item in obj:
            res = find_quiz_str(item)
            if res:
                return res
    elif isinstance(obj, dict):
        if 'quiz' in obj and isinstance(obj['quiz'], list):
            return obj
        for val in obj.values():
            res = find_quiz_str(val)
            if res:
                return res
    return None

def try_parse_quiz_data(quiz_dict):
    # Extracts questions and standardises key formats
    raw_questions = quiz_dict.get("quiz", [])
    if not raw_questions and isinstance(quiz_dict, list):
        raw_questions = quiz_dict
        
    formatted_questions = []
    for item in raw_questions:
        if isinstance(item, dict) and "question" in item:
            options = item.get("answerOptions", item.get("options", []))
            formatted_options = []
            for opt in options:
                if isinstance(opt, dict):
                    formatted_options.append({
                        "text": opt.get("text", ""),
                        "isCorrect": opt.get("isCorrect", False),
                        "rationale": opt.get("rationale", "")
                    })
            formatted_questions.append({
                "question": item.get("question"),
                "options": formatted_options,
                "hint": item.get("hint")
            })
    return formatted_questions

def extract_and_clean_mcq(raw_text):
    if not raw_text:
        return "", "Empty input"
        
    # --- Strategy 1: Direct JSON quiz parsing ---
    try:
        s_clean = raw_text.strip()
        # Strip Google XSS protection prefix if present
        if s_clean.startswith(")]}'"):
            s_clean = s_clean[4:].strip()
        if s_clean.startswith('[') or s_clean.startswith('{'):
            quiz_data = json.loads(clean_invalid_escapes(s_clean), strict=False)
            questions = try_parse_quiz_data(quiz_data)
            if questions:
                return json.dumps(questions, indent=2, ensure_ascii=False), "Strategy 1: Direct JSON"
    except Exception:
        pass

    # --- Strategy 2: HTML Page Source parsing (data-app-data attribute) ---
    match = re.search(r'data-app-data\s*=\s*(?:["\'&]|&quot;|\\\"|\\\')+(\{.*?\})(?:["\'&]|&quot;|\\\"|\\\')+', raw_text, re.DOTALL)
    if match:
        try:
            app_data_str = match.group(1)
            app_data_str_clean = app_data_str.replace('&quot;', '"').replace('&#39;', "'").replace('&amp;', '&').replace('\\"', '"').replace("\\'", "'")
            quiz_data = json.loads(clean_invalid_escapes(app_data_str_clean), strict=False)
            questions = try_parse_quiz_data(quiz_data)
            if questions:
                return json.dumps(questions, indent=2, ensure_ascii=False), "Strategy 2: HTML Attribute data-app-data"
        except Exception:
            pass

    # --- Strategy 3: Google API Network Response Stream Scanning ---
    decoder = json.JSONDecoder(strict=False)
    for index_match in re.finditer(r'\[', raw_text):
        start_pos = index_match.start()
        try:
            cleaned_segment = clean_invalid_escapes(raw_text[start_pos:])
            data, _ = decoder.raw_decode(cleaned_segment)
            
            # Deep search for the quiz string
            quiz_json_str = find_quiz_str(data)
            if quiz_json_str:
                cleaned_quiz_str = clean_invalid_escapes(quiz_json_str)
                quiz_data = json.loads(cleaned_quiz_str, strict=False)
                questions = try_parse_quiz_data(quiz_data)
                if questions:
                    return json.dumps(questions, indent=2, ensure_ascii=False), "Strategy 3: Google API Stream"
        except Exception:
            continue

    return "", "Error: Could not locate or parse any valid quiz data using any strategy."

if raw_data:
    output_json, strategy_used = extract_and_clean_mcq(raw_data)
    
    if output_json:
        # Write to clean_mcq.json
        with open('clean_mcq.json', 'w', encoding='utf-8') as out_file:
            out_file.write(output_json)
        print(f"Success! Cleaned structural array successfully written to 'clean_mcq.json' (using {strategy_used})")
        
        # If the processed file was 'rawmcq.html', empty it
        if input_file == 'rawmcq.html':
            try:
                with open('rawmcq.html', 'w', encoding='utf-8') as f:
                    f.write('')
                print("Success! Temporary file 'rawmcq.html' has been emptied.")
            except Exception as empty_err:
                print(f"Warning: Failed to empty 'rawmcq.html' after conversion: {empty_err}")
    else:
        print(strategy_used)