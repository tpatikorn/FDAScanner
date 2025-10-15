# ABOUT THIS PROJECT
Project นี้เป็น web application สำหรับการตรวจสอบเลข อย. บนผลิตภัณฑ์
โดยที่ผู้ใช้สามารถถ่ายภาพของตรา อย. บนผลิตภัณฑ์แล้วระบบจะทำการถอดเลข อย. 13 หลัก จากภาพด้วย OCR
และทำการดึงข้อมูลจากสำนักงาน อย. ว่าเลข อย. นี้คือผลิตภัณฑ์อะไร และมีระบบอ่านออกเสียงข้อมูลผลิตภัณฑ์

หากผู้ใช้พบว่า ผลิตภัณฑ์ไม่ตรงกับข้อมูลจากเลข อย. ระบบยังมีการอำนวยความสะดวกสำหรับการรายงานไปยังสำนักงานอีกด้วย

demo:
https://mutually-learning-duckling.ngrok-free.app/fda_scan/

# ABOUT THE TEAM
Project นี้เป็น project จบของนักศึกษาหลักสูตรเทคโนโลยีสารสนเทศและเศรษฐกิจดิจิทัล มหาวิทยาลัยเทคโนโลยีราชมงคลสุวรรณภูมิ ศูนย์นนทบุรี ปีการศึกษา 2568 คือ
[นายทัศนสมิทธ์ พรหมโสภา](https://mutually-learning-duckling.ngrok-free.app/fda_scan/profile) และ 
[นายวัฒนเดช เสตกรณุกูล](https://mutually-learning-duckling.ngrok-free.app/fda_scan/profile) โดยมี 
[ดร.ธนพร ปฏิกรณ์](https://github.com/tpatikorn) เป็นอาจารย์ที่ปรึกษา

# TERM OF USE
Project นี้มีการแผยแพร่แบบสาธารณะเพื่อการศึกษาเท่านั้น หากท่านต้องการนำ project นี้ไปใช้ประโยชน์ ทั้งในด้านพาณิชย์และวิจัย กรุณาติดต่อผู้ดูแล project เพื่อขออณุญาต และอ้างอิงอย่างถูกต้อง

# INSTALLATION
## วิธีที่ 1 ติดตั้งผ่านไฟล์ requirements.txt
1. สร้างและเปิดใช้งาน Virtual Environment
      `python -m venv venv`
2. เปิดใช้งาน (Activate) Virtual Environment:
      `.\venv\Scripts\activate
      source venv/bin/activate`
3. ติดตั้งไลบรารีทั้งหมดจากไฟล์ requirements.txt:
`pip install -r requirements.txt`

## วิธีที่ 2 ติดตั้งด้วยคำสั่ง pip โดยตรง
1. สร้างและเปิดใช้งาน Virtual Environment
2. รันคำสั่ง pip install เพื่อติดตั้งทุกอย่างในครั้งเดียว
    หลังจาก venv ทำงานแล้ว ให้คัดลอกและรันคำสั่งข้างล่างนี้
`pip install Flask Flask-Cors Flask-Mail pymysql pdfkit requests beautifulsoup4 gTTS ultralytics easyocr opencv-python numpy`

## สิ่งสำคัญที่ต้องติดตั้งเพิ่มเติม (สำหรับสร้าง PDF)
ไลบรารี pdfkit จำเป็นต้องมีโปรแกรม wkhtmltopdf ติดตั้งอยู่ในเครื่องของคุณด้วย ซึ่ง pip ไม่สามารถติดตั้งให้ได้
ดาวน์โหลดและติดตั้ง wkhtmltopdf:
1. ไปที่: https://wkhtmltopdf.org/downloads.html
2. เลือกเวอร์ชันที่ตรงกับระบบปฏิบัติการของคุณ (Windows, macOS, Linux) แล้วทำการติดตั้งตามปกติ
3. หลังจากติดตั้งเสร็จ คุณต้องหาตำแหน่งที่ไฟล์ wkhtmltopdf.exe ถูกติดตั้งไว้
4. Path ในโค้ด app.py ให้ถูกต้องตามตำแหน่งในเครื่องของคุณ

