วิธีที่ 1 ติดตั้งผ่านไฟล์ requirements.txt
1.สร้างและเปิดใช้งาน Virtual Environment
      python -m venv venv
2.เปิดใช้งาน (Activate) Virtual Environment:
      .\venv\Scripts\activate
      source venv/bin/activate
3.ติดตั้งไลบรารีทั้งหมดจากไฟล์ requirements.txt:
pip install -r requirements.txt

วิธีที่ 2 ติดตั้งด้วยคำสั่ง pip โดยตรง
1 สร้างและเปิดใช้งาน Virtual Environment
2 รันคำสั่ง pip install เพื่อติดตั้งทุกอย่างในครั้งเดียว
    หลังจาก venv ทำงานแล้ว ให้คัดลอกและรันคำสั่งข้างล่างนี้
pip install Flask Flask-Cors Flask-Mail pymysql pdfkit requests beautifulsoup4 gTTS ultralytics easyocr opencv-python numpy


สิ่งสำคัญที่ต้องติดตั้งเพิ่มเติม (สำหรับสร้าง PDF)
ไลบรารี pdfkit จำเป็นต้องมีโปรแกรม wkhtmltopdf ติดตั้งอยู่ในเครื่องของคุณด้วย ซึ่ง pip ไม่สามารถติดตั้งให้ได้
ดาวน์โหลดและติดตั้ง wkhtmltopdf:
ไปที่: https://wkhtmltopdf.org/downloads.html
เลือกเวอร์ชันที่ตรงกับระบบปฏิบัติการของคุณ (Windows, macOS, Linux) แล้วทำการติดตั้งตามปกติ
แก้ไข Path ในโค้ด app.py:
หลังจากติดตั้งเสร็จ คุณต้องหาตำแหน่งที่ไฟล์ wkhtmltopdf.exe ถูกติดตั้งไว้
จากนั้นไปแก้ไข Path ในโค้ด app.py ให้ถูกต้องตามตำแหน่งในเครื่องของคุณ
ตัวอย่าง (สำหรับ Windows):
code
Python
PDFKIT_CONFIG = pdfkit.configuration(
    wkhtmltopdf=r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe' # <-- แก้ไข Path ตรงนี้
)
```    *   **สำหรับ macOS/Linux** Path อาจจะเป็น `/usr/local/bin/wkhtmltopdf` (สามารถหาได้ด้วยคำสั่ง `which wkhtmltopdf` ใน Terminal)