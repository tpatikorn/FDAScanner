# ==========================================================
#                      IMPORTS (รวมจาก 2 ไฟล์)
# ==========================================================
import os
import uuid
import pymysql
import pdfkit
import json
import datetime
import base64
import re
from collections import defaultdict
from difflib import SequenceMatcher

import cv2
import requests
from bs4 import BeautifulSoup
from fontTools.ufoLib import IMAGES_DIRNAME
from gtts import gTTS
from ultralytics import YOLO
import easyocr

from flask import (Flask, send_from_directory, render_template, request,
                   url_for, jsonify, make_response, Blueprint)
from werkzeug.utils import secure_filename
from flask_cors import CORS

from flask_mail import Mail, Message

import dotenv

# ==========================================================
#              FLASK APP INITIALIZATION & CONFIG
# ==========================================================

DEBUG_DO_SEND_EMAIL = False

bp = Blueprint('fda_scan', __name__, template_folder='templates', static_folder='static')

app = Flask(__name__, static_folder="static")
CORS(app)  # เปิดใช้งาน CORS สำหรับทุก Route

dotenv.load_dotenv()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'ไgif'}

PDF_FOLDER = "uploads/pdf"
AUDIO_FOLDER = "uploads/audio"
IMAGE_REPORT_FDA_FOLDER = 'uploads/image_report_fda'
IMAGE_SCAN_FDA_FOLDER = 'uploads/image_scan_fda'  # โฟลเดอร์สำหรับรูปภาพที่สแกน
IMAGE_REPORT_ADDITIONAL_FOLDER = 'uploads/image_report_additional'  # โฟลเดอร์สำหรับ "รูปที่ต้องการรายงาน"
VUE_FOLDER = "uploads/vue_dashboard"

RECIPIENT_EMAIL = os.getenv('RECIPIENT_EMAIL')

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')  # เปลี่ยนเป็นรหัสผ่าน 16 หลักที่คุณสร้าง จาก Gmil
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')  # ควรใช้บัญชีเดียวกับ MAIL_USERNAME
mail = Mail(app)

# ตรวจสอบ Path ของ wkhtmltopdf ให้ถูกต้องตามเครื่องของคุณหากใช้งานจริง
PDFKIT_CONFIG = pdfkit.configuration(
    wkhtmltopdf=r'C:\dev_tools\wkhtmltox\bin\wkhtmltopdf.exe'
)

# ==========================================================
#              MODELS & DATA PRE-LOADING
# ==========================================================

# --- โหลดโมเดล Machine Learning (จาก app2.py) ---
print("กำลังโหลดโมเดล YOLO...")
model = YOLO("models/best.pt")
print("โหลดโมเดล YOLO สำเร็จ!")

print("กำลังโหลดโมเดล EasyOCR...")
reader = easyocr.Reader(['th', 'en'], gpu=False)
print("โหลดโมเดล EasyOCR สำเร็จ!")

# --- Pre-load Data on App Startup (จาก app.py) ---
FDA_TYPES_DATA_by_id = {}
ALL_VALID_CATEGORY_NAMES_LIST = []
GEOGRAPHY_DATA = []
PROVINCE_DATA = []

try:
    fdatype_path = os.path.join(app.root_path, 'static', 'thai-data', 'fdatype.json')
    if os.path.exists(fdatype_path):
        with open(fdatype_path, 'r', encoding='utf-8') as f:
            fda_types_list = json.load(f)
            FDA_TYPES_DATA_by_id = {str(item['id']): item['name'] for item in fda_types_list}
            ALL_VALID_CATEGORY_NAMES_LIST = [item['name'] for item in fda_types_list]
        print("โหลดข้อมูลหมวดหมู่ (fdatype.json) สำเร็จ!")
    else:
        print(f"Warning: fdatype.json not found at {fdatype_path}.")

    geography_path = os.path.join(app.root_path, 'static', 'thai-data', 'fdageo.json')
    if os.path.exists(geography_path):
        with open(geography_path, 'r', encoding='utf-8') as f:
            GEOGRAPHY_DATA = json.load(f)
        print("โหลดข้อมูลภูมิภาค (fdageo.json) สำเร็จ!")
    else:
        print(f"Warning: fdageo.json not found at {geography_path}.")

    province_path = os.path.join(app.root_path, 'static', 'thai-data', 'api_province_with_amphure_tambon.json')
    if os.path.exists(province_path):
        with open(province_path, 'r', encoding='utf-8') as f:
            PROVINCE_DATA = json.load(f)
        print("โหลดข้อมูลจังหวัด-อำเภอ-ตำบล (api_province_with_amphure_tambon.json) สำเร็จ!")
    else:
        print(f"Warning: api_province_with_amphure_tambon.json not found at {province_path}.")

except Exception as e:
    print(f"Error loading data during startup: {e}")


# ==========================================================
#                   HELPER FUNCTIONS
# ==========================================================

# --- Database Connection (จาก app.py) ---
def connect_db():
    try:
        conn = pymysql.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            db=os.getenv('DB_NAME'),
            port=int(os.getenv('DB_PORT')),
            charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor
        )
        return conn
    except Exception as e:
        print(f"เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: {e}")
        return None


# --- File Handling (จาก app.py) ---
def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# =======================================================================
# START: IMAGE PROCESSING & OCR FUNCTIONS (UPDATED FROM app2.py)
# =======================================================================

def is_match(expected, detected, threshold=0.8):
    similarity = SequenceMatcher(None, expected, detected).ratio()
    return similarity >= threshold, similarity


def clean_ocr_text(text):
    replacements = {'O': '0', 'o': '0', 'I': '1', 'l': '1', 'B': '8', 'S': '5', 'ไ': '7', ' ': '', 'G': '0'}
    cleaned_text = text
    for char, replacement in replacements.items():
        cleaned_text = cleaned_text.replace(char, replacement)
    return cleaned_text


def read_numbers(img):
    results = reader.readtext(img, detail=0, paragraph=False, allowlist="0123456789-")
    if results:
        full_text = "".join(results)
        cleaned_text = clean_ocr_text(full_text)
        return "".join(re.findall(r'\d', cleaned_text))
    else:
        return ""


def process_single_image(img):
    """ฟังก์ชันกลางสำหรับประมวลผลภาพเดียว (เวอร์ชันอัปเดตเพื่อแยกแยะข้อผิดพลาด)"""
    results = model(img)
    # 1. ตั้งค่าสถานะเริ่มต้นว่า "YOLO ยังไม่เจออะไร"
    detected_number = "YOLO_NOT_FOUND"

    for result in results:
        # ถ้าใน result object ไม่มี bounding boxes เลย ก็ข้ามไป result ถัดไป
        if not result.boxes:
            continue

        # 2. ถ้าโค้ดมาถึงบรรทัดนี้ได้ แสดงว่า YOLO "เจอ" กรอบสี่เหลี่ยมแล้ว
        # เราจึงเปลี่ยนสถานะข้อผิดพลาดที่เป็นไปได้ให้เป็น "OCR อ่านไม่สมบูรณ์"
        detected_number = "OCR_INCOMPLETE"

        for box in result.boxes.xyxy:
            x1, y1, x2, y2 = map(int, box)
            cropped_img = img[y1:y2, max(0, x1 - 20):min(x2 + 100, img.shape[1])]

            if cropped_img.size == 0: continue

            # ทางเลือกที่ 1: อ่าน OCR โดยตรง
            detected_number = read_numbers(cropped_img)

            # ทางเลือกที่ 1: greyscale
            gray = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2GRAY)
            binary_img = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            fallback_results = read_numbers(binary_img)
            # if the number of digits here is closer to 13 than currently detected number, use it
            if abs(len(fallback_results) - 13) < abs(len(detected_number) - 13):
                detected_number = fallback_results

            if len(detected_number) == 13:
                break  # เจอเลข 13 หลักแล้ว ออกจาก loop ของ box

    # 3. คืนค่าสถานะสุดท้ายที่ได้จากการประมวลผล
    return detected_number


# =======================================================================
# START: ROUTES FROM app2.py (Image Scanning & FDA Lookup) (UPDATED)
# =======================================================================

@bp.route("/scan-home")
def scan_home():
    """หน้าหลักสำหรับฟังก์ชันสแกน"""
    return render_template("index.html")


@bp.route("/scan", methods=["POST"])
def scan_image():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]

    if file.filename != '':
        os.makedirs(IMAGE_SCAN_FDA_FOLDER, exist_ok=True)
        filename = f"{uuid.uuid4().hex}.jpg"
        save_path = os.path.join(IMAGE_SCAN_FDA_FOLDER, filename)
        file.save(save_path)
        print(f"รูปภาพถูกบันทึกที่: {save_path}")
        img = cv2.imread(save_path)
    else:
        return jsonify({"error": "No selected file"}), 400

    detection_result = process_single_image(img)

    if detection_result == "YOLO_NOT_FOUND":
        return jsonify({"error": "ระบบไม่พบกรอบเลข อย. ในภาพ โปรดจัดตำแหน่งให้ชัดเจน"})
    elif detection_result == "OCR_INCOMPLETE":
        return jsonify(
            {"error": "ระบบอ่านเลขได้ไม่ครบ 13 หลัก กรุณาถ่ายภาพอีกครั้ง ให้เห็นเลขชัดเจน และในที่มีแสงสว่างเพียงพอ"})

    return jsonify({"number": detection_result, "image_filename": filename})


@bp.route("/scan-folder", methods=["POST"])
def scan_folder():
    folder_path = request.form.get("folder_path", "test_images")
    if not os.path.exists(folder_path):
        return jsonify({"error": f"Folder '{folder_path}' not found"}), 400
    results_list = []
    similarity_scores = []
    for file_name in os.listdir(folder_path):
        if file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            file_path = os.path.join(folder_path, file_name)
            img = cv2.imread(file_path)
            detected_number = process_single_image(img)
            expected_number = file_name.split(".")[0]
            match, similarity = is_match(expected_number, detected_number)
            similarity_scores.append(similarity)
            results_list.append({
                "file": file_name, "number": detected_number,
                "match": match, "similarity": round(similarity, 2)
            })
    avg_similarity = round(sum(similarity_scores) / len(similarity_scores), 2) if similarity_scores else 0
    return jsonify({
        "results": results_list, "average_similarity": avg_similarity
    })


@bp.route("/result")
def result():
    number = request.args.get("number")
    scanned_image_filename = request.args.get("image")
    if not number or not number.isdigit() or len(number) != 13:
        return "เลขสารบบไม่ถูกต้อง", 400

    url = f"https://porta.fda.moph.go.th/FDA_SEARCH_ALL/PRODUCT/FRM_PRODUCT_FOOD.aspx?fdpdtno={number}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        return f"ไม่สามารถเชื่อมต่อกับเว็บไซต์ อย. ได้: {e}", 500

    soup = BeautifulSoup(response.content, "html.parser")

    def get_text(selector):
        element = soup.select_one(selector)
        return element.text.strip() if element else "ไม่พบข้อมูล"

    product_data = {
        "fda_number": get_text("#ContentPlaceHolder1_lbl_fdpdtno"),
        "category": get_text("#ContentPlaceHolder1_lbl_typecd"),
        "product_group": get_text("#ContentPlaceHolder1_lbl_type"),
        "product_name_th": get_text("#ContentPlaceHolder1_lbl_thai"),
        "product_name_en": get_text("#ContentPlaceHolder1_lbl_eng"),
        "product_status": get_text("#ContentPlaceHolder1_lbl_lcnstatus0"),
        "licensee": get_text("#ContentPlaceHolder1_lbl_name"),
        "licensee_place": get_text("#ContentPlaceHolder1_lbl_lctname"),
        "licensee_address": get_text("#ContentPlaceHolder1_lbl_lctaddr"),
        "license_status": get_text("#ContentPlaceHolder1_lbl_lcnstatus"),
    }

    if product_data["fda_number"] == "ไม่พบข้อมูล":
        return f"ไม่พบข้อมูลสำหรับเลขสารบบ {number} ในระบบของ อย.", 404

    text_to_speak = f"เลขสารบบ {product_data['fda_number']}, ชื่อผลิตภัณฑ์ {product_data['product_name_th']}, สถานะ {product_data['product_status']}"
    tts = gTTS(text=text_to_speak, lang='th')

    audio_filename = f"{uuid.uuid4().hex}.mp3"
    audio_path_local = os.path.join(AUDIO_FOLDER, audio_filename)
    tts.save(audio_path_local)
    product_data['audio_path'] = url_for("fda_scan.serve_audio", filename=audio_filename)

    com_fda_data = (
        f"เลขสารบบ อย.: {product_data['fda_number']}\n"
        f"ประเภท: {product_data['category']}\n"
        f"ชื่อผลิตภัณฑ์ (TH): {product_data['product_name_th']}\n"
        f"สถานะผลิตภัณฑ์: {product_data['product_status']}\n"
    )
    product_data['com_fda_real_data'] = com_fda_data

    return render_template("result.html", scanned_image_filename=scanned_image_filename, **product_data)


# ==========================================================
#     START: ROUTES FROM app.py (Form, Admin, Dashboard)
# ==========================================================

# --- API ROUTES FOR DYNAMIC DROPDOWNS ---
@bp.route('/get_geographies')
def get_geographies_api():
    return jsonify(GEOGRAPHY_DATA)


@bp.route('/get_provinces/<int:geography_id>')
def get_provinces_api(geography_id):
    filtered_provinces = [p for p in PROVINCE_DATA if p.get('geography_id') == geography_id]
    return jsonify(filtered_provinces)


@bp.route('/get_amphures/<int:province_id>')
def get_amphures_api(province_id):
    for province in PROVINCE_DATA:
        if province.get('id') == province_id:
            return jsonify(province.get('amphure', []))
    return jsonify([])


@bp.route('/get_tambons/<int:amphure_id>')
def get_tambons_api(amphure_id):
    for province in PROVINCE_DATA:
        for amphure in province.get('amphure', []):
            if amphure.get('id') == amphure_id:
                return jsonify(amphure.get('tambon', []))
    return jsonify([])


# --- MAIN APPLICATION ROUTES ---
@bp.route('/')
def homepage():
    """แสดงหน้า Homepage หลักที่มีปุ่มไปยังหน้าต่างๆ"""
    return render_template('homepage.html')


@bp.route('/manual')
def manual():
    """แสดงหน้าคู่มือการใช้งาน"""
    return render_template('manual.html')


@bp.route('/form', methods=['GET', 'POST'])
def form():
    if request.method == 'POST':
        # ตรวจสอบว่าเป็นการ submit form จริง หรือแค่การกดปุ่มจากหน้า result
        if 'com_name' not in request.form:
            # POST request จากปุ่ม "ร้องเรียนผลิตภัณฑ์" ในหน้า result
            com_code_initial = request.form.get('com_code', '')
            com_fda_real_data_initial = request.form.get('com_fda_real_data', '')
            scanned_image_filename = request.form.get('scanned_image', '')

            user_data = {}
            user_info_cookie = request.cookies.get('user_info')
            if user_info_cookie:
                try:
                    user_data = json.loads(user_info_cookie)
                except json.JSONDecodeError:
                    print("ไม่สามารถอ่านข้อมูลจาก cookie ได้")

            return render_template('form.html', user_data=user_data,
                                   com_code=com_code_initial,
                                   com_fda_real_data=com_fda_real_data_initial,
                                   scanned_image=scanned_image_filename,
                                   is_from_scan=True)
        else:
            # POST request จากการ submit form จริง
            com_name = request.form.get('com_name')
            com_surname = request.form.get('com_surname')
            com_tel = request.form.get('com_tel')
            com_email = request.form.get('com_email')
            com_code = request.form.get('com_code')
            source = request.form.get('source')
            com_reported = request.form.get('com_reported')
            com_fda_data = request.form.get('com_fda_data')

            # รับค่า ID จากฟอร์ม
            geography_id = request.form.get('com_geographies')
            province_id = request.form.get('province')
            amphure_id = request.form.get('district')
            tambon_id = request.form.get('subdistrict')
            fdatype_id = request.form.get('fdatype')
            com_category_name = FDA_TYPES_DATA_by_id.get(str(fdatype_id), "ไม่ระบุ")

            try:
                geography_id = int(request.form.get('com_geographies'))
                province_id = int(request.form.get('province'))
                amphure_id = int(request.form.get('district'))
                tambon_id = int(request.form.get('subdistrict'))  # สำคัญที่สุด
            except (ValueError, TypeError):
                # ถ้าค่าที่ส่งมาไม่ใช่ตัวเลข (เช่น เป็นค่าว่าง) ให้แจ้งข้อผิดพลาด
                print("ข้อมูลที่อยู่ (ภูมิภาค, จังหวัด, อำเภอ, หรือตำบล) ไม่ถูกต้องหรือไม่ได้เลือก")
                return "กรุณาเลือกข้อมูลสถานที่ให้ครบถ้วน", 400

            # --- Handle image file image_report_fda ---
            image_filenames = []
            scanned_image_filename = request.form.get('scanned_image', '')
            if scanned_image_filename:
                scanned_image_path = os.path.join(IMAGE_SCAN_FDA_FOLDER, scanned_image_filename)
                if os.path.exists(scanned_image_path):
                    import shutil
                    new_filename_for_upload = f"scanned_{uuid.uuid4().hex}.jpg"
                    dest_path = os.path.join(IMAGE_REPORT_FDA_FOLDER, new_filename_for_upload)
                    shutil.copy(scanned_image_path, dest_path)
                    image_filenames.append(new_filename_for_upload)

            new_scanned_files = request.files.getlist('images[]')
            for file in new_scanned_files:
                # ตรวจสอบว่ามีที่ว่างเหลือพอให้อัปโหลดหรือไม่ (สูงสุด 5 รูป)
                if file and allowed_file(file.filename) and len(image_filenames) < 5:
                    # สร้างชื่อไฟล์ใหม่เพื่อป้องกันการซ้ำกัน
                    filename = f"scanned_new_{uuid.uuid4().hex}_{secure_filename(file.filename)}"
                    save_path = os.path.join(IMAGE_REPORT_FDA_FOLDER, filename)
                    try:
                        file.save(save_path)
                        image_filenames.append(filename)
                    except Exception as e:
                        print(f"เกิดข้อผิดพลาดในการบันทึก 'รูปภาพจากการสแกน' (ไฟล์ใหม่): {e}")

            report_image_filenames = []
            report_files = request.files.getlist('report_images')
            for report_file in report_files[:4]:
                if report_file and allowed_file(report_file.filename):
                    filename = f"report_{uuid.uuid4().hex}_{secure_filename(report_file.filename)}"
                    save_path = os.path.join(IMAGE_REPORT_ADDITIONAL_FOLDER, filename)
                    try:
                        report_file.save(save_path)
                        report_image_filenames.append(filename)
                    except Exception as e:
                        print(f"เกิดข้อผิดพลาดในการบันทึก 'รูปที่ต้องการรายงาน': {e}")

            while len(image_filenames) < 5:
                image_filenames.append(None)
            while len(report_image_filenames) < 4:
                report_image_filenames.append(None)

            # --- Validate essential data ---
            if not all([com_name, com_surname, com_tel, com_email, com_category_name,
                        geography_id, province_id, amphure_id, tambon_id,
                        source, com_reported, com_fda_data]):
                print("ข้อมูลไม่ครบถ้วน!")
                return "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", 400

            # --- Save data to the database ---
            conn = connect_db()
            if conn:
                try:
                    cursor = conn.cursor()
                    sql = """
                          INSERT INTO complaint (com_name, com_surname, com_tel, com_email, com_code,
                                                 com_category, com_source, com_reported, com_fda_data,
                                                 tambon_id,
                                                 com_img1, com_img2, com_img3, com_img4, com_img5,
                                                 com_report_img1, com_report_img2, com_report_img3, com_report_img4)
                          VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) \
                          """
                    cursor.execute(sql, (
                        com_name, com_surname, com_tel, com_email, com_code,
                        com_category_name, source, com_reported,
                        com_fda_data, tambon_id,
                        *image_filenames[:5],
                        *report_image_filenames[:4]
                    ))
                    conn.commit()
                    print("บันทึกข้อมูลลงฐานข้อมูลสำเร็จ!")
                except Exception as e:
                    conn.rollback()
                    print(f"เกิดข้อผิดพลาดในการบันทึกข้อมูล: {e}")
                    return "เกิดข้อผิดพลาดในการบันทึกข้อมูล", 500
                finally:
                    conn.close()
            else:
                return "ไม่สามารถเชื่อมต่อฐานข้อมูลได้", 500

            # --- Prepare data for success page and PDF generation ---
            geography_name_display, province_name_display, amphure_name_display, tambon_name_display = "ไม่ระบุ", "ไม่ระบุ", "ไม่ระบุ", "ไม่ระบุ"
            try:
                for geo in GEOGRAPHY_DATA:
                    if geo['id'] == int(geography_id):
                        geography_name_display = geo['name']
                        break
                for prov in PROVINCE_DATA:
                    if prov['id'] == int(province_id):
                        province_name_display = prov['name_th']
                        for amphure in prov.get('amphure', []):
                            if amphure['id'] == int(amphure_id):
                                amphure_name_display = amphure['name_th']
                                for tambon in amphure.get('tambon', []):
                                    if tambon['id'] == int(tambon_id):
                                        tambon_name_display = tambon['name_th']
                                        break
                                break
                        break
            except (ValueError, TypeError):
                print("ไม่สามารถค้นหาชื่อเต็มของที่อยู่ได้ อาจเนื่องมาจาก ID ไม่ถูกต้อง")

            display_data = {
                'com_name': com_name, 'com_surname': com_surname, 'com_tel': com_tel,
                'com_email': com_email, 'com_code': com_code, 'com_category': com_category_name,
                'com_geographies': geography_name_display,
                'province': province_name_display,
                'district': amphure_name_display,
                'subdistrict': tambon_name_display,
                'source': source,
                'com_reported': com_reported, 'com_fda_data': com_fda_data,
                'images': image_filenames,
                'report_images': report_image_filenames,
            }

            # --- PDF Generation ---
            os.makedirs(PDF_FOLDER, exist_ok=True)
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            pdf_filename = f'Product_Complaint_Form_{timestamp}_{uuid.uuid4().hex}.pdf'
            pdf_path = os.path.join(PDF_FOLDER, pdf_filename)
            try:
                options = {
                    'encoding': "UTF-8", 'enable-javascript': None, 'no-stop-slow-scripts': None,
                    'page-size': 'A4', 'margin-top': '0mm', 'margin-right': '0mm',
                    'margin-bottom': '0mm', 'margin-left': '0mm', 'zoom': '1.3',
                }
                pdf_data = display_data.copy()
                image_base64_data = []
                for filename in display_data.get('images', []):
                    if filename:
                        try:
                            full_path = os.path.join(IMAGE_REPORT_FDA_FOLDER, filename)
                            with open(full_path, "rb") as image_file:
                                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                                image_base64_data.append(f"data:image/jpeg;base64,{encoded_string}")
                        except Exception as e:
                            print(f"ไม่สามารถเข้ารหัส Base64 รูปภาพ {filename}: {e}")
                pdf_data['image_base64_data'] = image_base64_data

                report_images_base64_data = []
                for filename in display_data.get('report_images', []):
                    if filename:
                        try:
                            report_image_path = os.path.join(IMAGE_REPORT_ADDITIONAL_FOLDER, filename)
                            with open(report_image_path, "rb") as f:
                                encoded_string = base64.b64encode(f.read()).decode('utf-8')
                                report_images_base64_data.append(f"data:image/jpeg;base64,{encoded_string}")
                        except Exception as e:
                            print(f"ไม่สามารถเข้ารหัส Base64 ของ 'รูปที่ต้องการรายงาน' ได้: {e}")
                pdf_data['report_images_base64_data'] = report_images_base64_data

                pdf_html_content_for_pdf = render_template('success.html', data=pdf_data,
                                                           current_datetime=datetime.datetime.now(), for_pdf=True)
                pdfkit.from_string(pdf_html_content_for_pdf, pdf_path, configuration=PDFKIT_CONFIG, options=options)
                print(f"สร้าง PDF สำเร็จ: {pdf_path}")
            except Exception as e:
                print(f"เกิดข้อผิดพลาดในการสร้าง PDF: {e}")

            # --- Send Email ---
            user_email = request.form.get('com_email')
            current_dt_formatted = datetime.datetime.now().strftime('%d %B %Y, %H:%M:%S')
            subject = f"การแจ้งเรื่องร้องเรียนเกี่ยวกับผลิตภัณฑ์ เลขสารบบ: {com_code}"
            body = f"""
            <p>เรียน เจ้าหน้าที่สำนักงานคณะกรรมการอาหารและยา</p>
            <p>ระบบแจ้งเรื่องร้องเรียนผลิตภัณฑ์ได้รับแจ้งเรื่องจากผู้ใช้งาน และขออนุญาตนำส่งข้อมูลมาเพื่อโปรดพิจารณาดำเนินการ</p>
            <p>เพื่ออำนวยความสะดวกในการตรวจสอบเบื้องต้น ระบบได้สรุปข้อมูลสำคัญไว้ดังนี้:</p>
            <ul>
                <li><strong>เลขสารบบผลิตภัณฑ์:</strong> {com_code}</li>
                <li><strong>วันที่แจ้งเรื่อง:</strong> {current_dt_formatted}</li>
                <li><strong>ชื่อผู้ร้องเรียน:</strong> {com_name} {com_surname}</li>
                <li><strong>ข้อมูลติดต่อกลับ:</strong> {com_email}, {com_tel}</li>
            </ul>
            <p>รายละเอียดทั้งหมด รวมถึงรูปภาพประกอบและข้อมูลอื่น ๆ ได้ถูกรวบรวมไว้ในไฟล์ PDF ที่แนบมาพร้อมนี้แล้ว</p>
            <p>จึงเรียนมาเพื่อโปรดพิจารณาดำเนินการในส่วนที่เกี่ยวข้องต่อไป</p>
            <br>
            <p>ขอแสดงความนับถืออย่างสูง</p>
            <p><strong>ระบบแจ้งเรื่องร้องเรียนผลิตภัณฑ์อัตโนมัติ</strong></p>
            """
            # END: แก้ไข Subject และ Body ของอีเมล

            try:
                msg = Message(subject, recipients=[RECIPIENT_EMAIL, user_email], reply_to=user_email)
                msg.html = body
                with open(pdf_path, 'rb') as fp:
                    msg.attach("Product_Complaint_Report.pdf", "application/pdf", fp.read())
                if DEBUG_DO_SEND_EMAIL:
                    mail.send(msg)
                    print(f"ส่งอีเมลสำเร็จถึง {RECIPIENT_EMAIL} และ {user_email}")
                else:
                    print(msg.html)
                    for attachment in msg.attachments:
                        print(attachment.filename)
                    print(f"DEBUG_DO_SEND_EMAIL=False\nส่งอีเมลสำเร็จถึง {RECIPIENT_EMAIL} และ {user_email}")
            except Exception as e:
                print(f"เกิดข้อผิดพลาดในการส่งอีเมล: {e}")

            # --- Render Success Page ---
            pdf_url = url_for('fda_scan.serve_pdf', filename=pdf_filename)
            response = make_response(
                render_template('success.html', data=display_data, current_datetime=datetime.datetime.now(),
                                pdf_url=pdf_url, for_pdf=False))
            return response

    # --- GET Request Handling ---
    else:
        user_data = {}
        user_info_cookie = request.cookies.get('user_info')
        if user_info_cookie:
            try:
                user_data = json.loads(user_info_cookie)
            except json.JSONDecodeError:
                print("ไม่สามารถอ่านข้อมูลจาก cookie ได้")

        response = make_response(render_template('form.html', user_data=user_data, is_from_scan=False))
        return response


# --- Dashboard and Admin Section ---
@bp.route('/admin')
def admin():
    conn = connect_db()
    complaints = []
    if conn:
        try:
            cursor = conn.cursor()
            # *** โค้ดที่แก้ไข: ใช้ JOIN เพื่อดึงข้อมูลชื่อเต็มมาแสดง ***
            sql_query = """
                        SELECT c.*,
                               t.name_th AS subdistrict_name,
                               a.name_th AS district_name,
                               p.name_th AS province_name
                        FROM complaint c
                                 LEFT JOIN thai_tambons t ON c.tambon_id = t.id
                                 LEFT JOIN thai_amphures a ON t.amphure_id = a.id
                                 LEFT JOIN thai_provinces p ON a.province_id = p.id
                        ORDER BY c.com_id DESC; \
                        """
            cursor.execute(sql_query)
            complaints = cursor.fetchall()
        except Exception as e:
            print(f"เกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูลสำหรับหน้า admin: {e}")
        finally:
            conn.close()
    return render_template('admin.html', complaints=complaints)


def get_dashboard_data():
    """Internal function to fetch and process all data required for the Dashboard."""
    conn = connect_db()
    if not conn: return None

    try:
        cursor = conn.cursor()

        # --- 1. Data for KPI Cards (แก้ไข SQL ให้ใช้ JOIN) ---
        cursor.execute("SELECT COUNT(*) as count FROM complaint WHERE DATE(created_at) = CURDATE()")
        complaints_today = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM complaint")
        total_complaints = cursor.fetchone()['count']
        cursor.execute(
            "SELECT com_category, COUNT(*) as count FROM complaint WHERE com_category IS NOT NULL AND com_category != '' GROUP BY com_category ORDER BY count DESC LIMIT 1")
        top_category_data = cursor.fetchone()

        # แก้ไข SQL สำหรับ Top Provinces
        cursor.execute("""
                       SELECT p.name_th AS province_name, COUNT(c.com_id) AS count
                       FROM complaint c
                           JOIN thai_tambons t
                       ON c.tambon_id = t.id
                           JOIN thai_amphures a ON t.amphure_id = a.id
                           JOIN thai_provinces p ON a.province_id = p.id
                       GROUP BY p.name_th
                       ORDER BY count DESC
                           LIMIT 10;
                       """)
        top_provinces_list = cursor.fetchall()

        # แก้ไข SQL สำหรับ Top Districts
        cursor.execute("""
                       SELECT a.name_th AS district_name, COUNT(c.com_id) AS count
                       FROM complaint c
                           JOIN thai_tambons t
                       ON c.tambon_id = t.id
                           JOIN thai_amphures a ON t.amphure_id = a.id
                       GROUP BY a.name_th
                       ORDER BY count DESC
                           LIMIT 1;
                       """)
        top_districts_data = cursor.fetchone()

        # แก้ไข SQL สำหรับ Top Subdistricts
        cursor.execute("""
                       SELECT t.name_th AS subdistrict_name, COUNT(c.com_id) AS count
                       FROM complaint c
                           JOIN thai_tambons t
                       ON c.tambon_id = t.id
                       GROUP BY t.name_th
                       ORDER BY count DESC
                           LIMIT 1;
                       """)
        top_subdistricts_data = cursor.fetchone()

        kpi_data = {
            "complaints_today": complaints_today, "total_complaints": total_complaints,
            "top_category": top_category_data['com_category'] if top_category_data else 'N/A',
            "top_provinces": top_provinces_list,
            "top_districts": top_districts_data['district_name'] if top_districts_data else 'N/A',
            "top_subdistricts": top_subdistricts_data['subdistrict_name'] if top_subdistricts_data else 'N/A'
        }

        # --- 2. Data for Monthly & Yearly Trends (ส่วนนี้ไม่ต้องแก้ เพราะใช้ com_category) ---
        with open(fdatype_path, 'r', encoding='utf-8') as f:
            all_categories_from_json = [item['name'] for item in json.load(f)]

        monthly_trends_data = {"labels": [], "datasets": []}
        sql_monthly_trends = """
                             SELECT YEAR (created_at) as year, MONTH (created_at) as month, com_category, COUNT (created_at) as count
                             FROM complaint
                             WHERE created_at >= DATE_SUB(CURDATE()
                                 , INTERVAL 12 MONTH)
                               AND com_category IS NOT NULL
                               AND com_category != ''
                             GROUP BY YEAR (created_at), MONTH (created_at), com_category
                             ORDER BY year, month, com_category; \
                             """
        cursor.execute(sql_monthly_trends)
        monthly_raw_data = cursor.fetchall()

        labels_monthly = []
        today = datetime.date.today()
        for i in range(12):
            current_month_date = today.replace(day=1) - datetime.timedelta(days=30 * (11 - i))
            labels_monthly.append(current_month_date.strftime("%b"))

        monthly_datasets = []
        category_colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8BC34A']

        for i, category_name in enumerate(all_categories_from_json):
            if category_name == 'ไม่ระบุ': continue
            category_data_map = defaultdict(int)
            for row in monthly_raw_data:
                if row['com_category'] == category_name:
                    month_label = datetime.date(row['year'], row['month'], 1).strftime("%b")
                    category_data_map[month_label] = row['count']
            data_values = [category_data_map.get(month_label, 0) for month_label in labels_monthly]
            monthly_datasets.append({
                "label": category_name, "data": data_values,
                "borderColor": category_colors[i % len(category_colors)],
                "backgroundColor": category_colors[i % len(category_colors)],
                "fill": True, "tension": 0.4
            })
        monthly_trends_data['labels'] = labels_monthly
        monthly_trends_data['datasets'] = monthly_datasets

        yearly_trends_data = {"labels": [], "datasets": []}
        sql_yearly_trends = """
                            SELECT YEAR (created_at) as year, com_category, COUNT (created_at) as count
                            FROM complaint
                            WHERE created_at >= DATE_SUB(CURDATE()
                                , INTERVAL 5 YEAR)
                              AND com_category IS NOT NULL
                              AND com_category != ''
                            GROUP BY YEAR (created_at), com_category
                            ORDER BY year, com_category; \
                            """
        cursor.execute(sql_yearly_trends)
        yearly_raw_data = cursor.fetchall()
        labels_yearly = [str(datetime.date.today().year - (4 - i)) for i in range(5)]
        yearly_datasets = []
        for i, category_name in enumerate(all_categories_from_json):
            if category_name == 'ไม่ระบุ': continue
            category_data_map = defaultdict(int)
            for row in yearly_raw_data:
                if row['com_category'] == category_name:
                    category_data_map[str(row['year'])] = row['count']
            data_values = [category_data_map.get(year_label, 0) for year_label in labels_yearly]
            yearly_datasets.append({
                "label": category_name, "data": data_values,
                "borderColor": category_colors[i % len(category_colors)],
                "backgroundColor": category_colors[i % len(category_colors)],
                "fill": True, "tension": 0.4
            })
        yearly_trends_data['labels'] = labels_yearly
        yearly_trends_data['datasets'] = yearly_datasets

        # --- 3. Data for Top Categories Chart (ส่วนนี้ไม่ต้องแก้) ---
        top_categories_chart_data = {"labels": [], "datasets": []}
        sql_top_categories = """
                             SELECT com_category, COUNT(com_category) as count
                             FROM complaint
                             WHERE com_category IS NOT NULL
                               AND com_category != ''
                               AND com_category NOT IN ('ไม่ระบุ'
                                 , 'ไม่ระระบุ')
                             GROUP BY com_category
                             ORDER BY count DESC;"""
        cursor.execute(sql_top_categories)
        top_categories_raw_data = cursor.fetchall()
        category_labels = [row['com_category'] for row in top_categories_raw_data]
        category_counts = [row['count'] for row in top_categories_raw_data]
        top_categories_chart_data['labels'] = category_labels
        top_categories_chart_data['datasets'] = [
            {'label': 'จำนวนรายงาน', 'data': category_counts, 'backgroundColor': category_colors}]

        # --- 4. Data for Recent Complaints List (แก้ไข SQL ให้ใช้ JOIN) ---
        cursor.execute("""
                       SELECT c.com_name, c.com_category, p.name_th as province_name, c.created_at
                       FROM complaint c
                                LEFT JOIN thai_tambons t ON c.tambon_id = t.id
                                LEFT JOIN thai_amphures a ON t.amphure_id = a.id
                                LEFT JOIN thai_provinces p ON a.province_id = p.id
                       ORDER BY c.created_at DESC LIMIT 5
                       """)
        recent_complaints_data = cursor.fetchall()
        for complaint in recent_complaints_data:
            if complaint.get('created_at'):
                complaint['created_at'] = complaint['created_at'].strftime('%d %b %Y, %H:%M')

        # --- 5. Latest Product Report (ส่วนนี้ไม่ต้องแก้) ---
        cursor.execute(
            "SELECT com_code, com_source, created_at, com_id FROM complaint WHERE com_code IS NOT NULL AND com_code != '' ORDER BY created_at DESC, com_id DESC LIMIT 1;")
        latest_report = cursor.fetchone()
        if latest_report:
            latest_report['created_at_formatted'] = latest_report['created_at'].strftime('%d-%m-%Y %H:%M')

        return {
            "kpi": kpi_data, "monthly_trends": monthly_trends_data, "yearly_trends": yearly_trends_data,
            "top_categories_chart": top_categories_chart_data, "recent_complaints": recent_complaints_data,
            "latest_product_report": latest_report
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return None
    finally:
        if conn: conn.close()


@bp.route('/fab_dashboard')
def fab_dashboard():
    dashboard_data = get_dashboard_data()
    current_year = datetime.date.today().year
    if dashboard_data:
        return render_template('dashboardchart.html', dashboard_data=dashboard_data, current_year=current_year)
    else:
        return render_template('dashboardchart.html', error_message="เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard",
                               dashboard_data={}, current_year=current_year)


# --- Other Utility Routes ---
@bp.route('/vue_dashboard/<path:filename>')
def serve_vue(filename):
    return send_from_directory(VUE_FOLDER, filename)


@bp.route('/image/<path:image_type>/<path:filename>')
def serve_image(image_type, filename):
    match image_type:
        case "scan_fda":
            return send_from_directory(IMAGE_SCAN_FDA_FOLDER, filename)
        case "report_fda":
            return send_from_directory(IMAGE_REPORT_FDA_FOLDER, filename)
        case "report_additional":
            return send_from_directory(IMAGE_REPORT_ADDITIONAL_FOLDER, filename)
        case _:
            return send_from_directory("static/images/", "fda.png")


@bp.route('/audio/<path:filename>')
def serve_audio(filename):
    return send_from_directory(AUDIO_FOLDER, filename)


@bp.route('/pdf/<path:filename>')
def serve_pdf(filename):
    return send_from_directory(PDF_FOLDER, filename)


@bp.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


@bp.route('/profile')
def profile():
    """แสดงหน้าโปรไฟล์คณะผู้จัดทำ"""
    return render_template('profile.html')


# ==========================================================
#                   MAIN EXECUTION BLOCK
# ==========================================================
for folder in [IMAGE_REPORT_FDA_FOLDER, PDF_FOLDER, IMAGE_SCAN_FDA_FOLDER, IMAGE_REPORT_ADDITIONAL_FOLDER,
               AUDIO_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app.register_blueprint(bp, url_prefix='/fda_scan')
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8088, debug=True, use_reloader=False)
