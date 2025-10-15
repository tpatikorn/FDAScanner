// dropdown.js

// ตัวแปรสำหรับเก็บข้อมูล JSON ทั้งหมด
let thaiGeoData = []; // สำหรับข้อมูลจังหวัด อำเภอ ตำบล (จาก api_province_with_amphure_tambon.json)
let fdaTypeData = []; // สำหรับข้อมูลประเภท (จาก fdatype.json)
let geographyData = []; // สำหรับข้อมูลภูมิภาค (จาก fdageo.json)

// กำหนดตัวแปรสำหรับ dropdown element ล่วงหน้าเพื่อความสะดวกและประสิทธิภาพ
const geographySelect = document.getElementById('com_geographies'); // Dropdown ภูมิภาค
const fdatypeSelect = document.getElementById('fdatype');       // Dropdown หมวดหมู่ FDA
const provinceSelect = document.getElementById('province');     // Dropdown จังหวัด
// *** แก้ไขตรงนี้: เปลี่ยน 'amphure' เป็น 'district' และ 'tambon' เป็น 'subdistrict' ***
const districtSelect = document.getElementById('district');     // Dropdown อำเภอ (ชื่อใน HTML คือ district)
const subdistrictSelect = document.getElementById('subdistrict'); // Dropdown ตำบล (ชื่อใน HTML คือ subdistrict)

// ฟังก์ชันสำหรับโหลดข้อมูล JSON ทั่วไปและจัดการข้อผิดพลาด
// จะรับ URL และข้อความแสดงข้อผิดพลาดเมื่อโหลดไม่ได้
async function fetchData(url, errorMsg) {
    try {
        const res = await fetch(url);
        if (!res.ok) { // ตรวจสอบว่า HTTP request สำเร็จหรือไม่ (เช่น 200 OK)
            // ถ้าสถานะไม่ใช่ 200 OK (เช่น 404 Not Found), จะโยน Error
            throw new Error(`HTTP error! สถานะ: ${res.status} - ${errorMsg}`);
        }
        const data = await res.json(); // แปลง response เป็น JSON
        console.log(`${errorMsg.replace('ไม่พบไฟล์', 'โหลด')}สำเร็จ ✅`, data); // แสดงข้อมูลใน Console
        return data;
    } catch (err) {
        console.error(`โหลด ${errorMsg} ไม่ได้ ❌`, err);
        // แสดงข้อความ Error บนหน้าเว็บเพื่อให้ผู้ใช้เห็นได้ชัดเจน
        // alert(`เกิดข้อผิดพลาดในการโหลดข้อมูลสำหรับทำตัวเลือก (${errorMsg}) กรุณาตรวจสอบ Console (F12) และไฟล์ JSON`);
        // หลีกเลี่ยง alert() ตามข้อกำหนด
        return []; // คืนค่า array ว่างเปล่าเพื่อป้องกันโค้ดหยุดทำงาน
    }
}

// ฟังก์ชันสำหรับเติมข้อมูลใน dropdown ทั่วไป
// รับ element ของ select, array ของข้อมูล, key สำหรับ value, key สำหรับข้อความที่แสดง, และข้อความตัวเลือกเริ่มต้น
function populateSelect(selectElement, items, valueKey, textKey, defaultOptionText) {
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`; // เคลียร์ตัวเลือกเดิมและเพิ่มตัวเลือกเริ่มต้น
    if (items && Array.isArray(items) && items.length > 0) {
        items.forEach(item => {
            const option = document.createElement('option');
            // กำหนดค่า value ของ option เป็นชื่อ (ข้อความ) ตามที่ผู้ใช้ต้องการ
            option.value = item[textKey];    
            // กำหนดข้อความที่แสดงใน option (ข้อความ)
            option.textContent = item[textKey]; 
            selectElement.appendChild(option);  // เพิ่ม option ลงใน select
        });
        selectElement.disabled = false; // เปิดใช้งาน dropdown ถ้ามีข้อมูล
    } else {
        selectElement.disabled = true; // ปิดใช้งาน dropdown ถ้าไม่มีข้อมูล
    }
}

// ฟังก์ชันสำหรับเติมข้อมูลใน dropdown ภูมิภาค
async function loadGeographies() {
    geographyData = await fetchData('/fda_scan/get_geographies', 'ไม่พบไฟล์ภูมิภาค (fdageo.json)');
    if (geographyData.length > 0) {
        // ใช้ 'name' เป็นทั้ง valueKey และ textKey เพื่อให้ option.value เป็นชื่อภูมิภาค
        populateSelect(geographySelect, geographyData, 'name', 'name', '-- เลือกภูมิภาค --');
    }
}

// ฟังก์ชันสำหรับเติมข้อมูลใน dropdown หมวดหมู่ FDA
async function loadFDAType() {
    fdaTypeData = await fetchData('/fda_scan/static/thai-data/fdatype.json', 'ไม่พบไฟล์ประเภท (fdatype.json)');
    if (fdaTypeData.length > 0) {
        // ใช้ 'name' เป็นทั้ง valueKey และ textKey เพื่อให้ option.value เป็นชื่อหมวดหมู่
        populateSelect(fdatypeSelect, fdaTypeData, 'name', 'name', '-- เลือกหมวดหมู่ --');
    }
}

// ฟังก์ชันสำหรับเติมข้อมูลใน dropdown จังหวัด
function loadProvinces() {
    // ใช้ 'name_th' เป็นทั้ง valueKey และ textKey เพื่อให้ option.value เป็นชื่อจังหวัด
    populateSelect(provinceSelect, thaiGeoData, 'name_th', 'name_th', '-- เลือกจังหวัด --');
    
    // รีเซ็ตและปิดใช้งาน dropdown อำเภอและตำบลเสมอเมื่อโหลดจังหวัดเสร็จ
    districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ --</option>';
    districtSelect.disabled = true; 
    subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';
    subdistrictSelect.disabled = true; 

    console.log("Dropdown จังหวัดโหลดข้อมูลแล้ว");
}

// ฟังก์ชันสำหรับเติมข้อมูลใน dropdown อำเภอ (เมื่อเลือกจังหวัด)
function loadAmphures(provinceName) {
    // หาข้อมูลจังหวัดที่เลือกจาก 'thaiGeoData' array โดยใช้ชื่อ (name_th)
    const province = thaiGeoData.find(p => p.name_th === provinceName); 
    console.log("กำลังประมวลผลจังหวัด:", provinceName, "ข้อมูลจังหวัดที่พบ:", province);

    // รีเซ็ต dropdown อำเภอและตำบลก่อนเติมข้อมูลใหม่
    districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ --</option>';
    subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';
    subdistrictSelect.disabled = true; // ปิดใช้งานตำบลไว้ก่อน

    // ตรวจสอบโครงสร้างข้อมูลของอำเภออย่างละเอียด
    // คาดว่าโครงสร้าง JSON ของจังหวัดจะมี key ชื่อ 'amphure' ที่เป็น array ของอำเภอ
    if (!province || !province.amphure || !Array.isArray(province.amphure) || province.amphure.length === 0) {
        console.warn("ไม่พบข้อมูลอำเภอสำหรับจังหวัดนี้ หรือโครงสร้าง JSON ของอำเภอผิดพลาด");
        districtSelect.disabled = true; // ปิดใช้งานอำเภอถ้าไม่มีข้อมูล
        return; // ออกจากฟังก์ชัน
    }

    // เติมข้อมูลอำเภอลงใน dropdown
    populateSelect(districtSelect, province.amphure, 'name_th', 'name_th', '-- เลือกอำเภอ --');
    console.log("Dropdown อำเภอโหลดข้อมูลแล้ว");
}

// ฟังก์ชันสำหรับเติมข้อมูลใน dropdown ตำบล (เมื่อเลือกอำเภอ)
function loadTambons(provinceName, amphureName) {
    // หาข้อมูลจังหวัดที่เลือกจาก 'thaiGeoData' array โดยใช้ชื่อ
    const province = thaiGeoData.find(p => p.name_th === provinceName);
    // หาข้อมูลอำเภอที่เลือกจาก 'province.amphure' โดยใช้ชื่อ
    const amphure = province?.amphure?.find(a => a.name_th === amphureName);
    console.log("กำลังประมวลผลอำเภอ:", amphureName, "ข้อมูลอำเภอที่พบ:", amphure);

    // รีเซ็ต dropdown ตำบลก่อนเติมข้อมูลใหม่
    subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';

    // ตรวจสอบโครงสร้างข้อมูลของตำบลอย่างละเอียด
    // คาดว่าโครงสร้าง JSON ของอำเภอจะมี key ชื่อ 'tambon' ที่เป็น array ของตำบล
    if (!amphure || !amphure.tambon || !Array.isArray(amphure.tambon) || amphure.tambon.length === 0) {
        console.warn("ไม่พบข้อมูลตำบลสำหรับอำเภอนี้ หรือโครงสร้าง JSON ของตำบลผิดพลาด");
        subdistrictSelect.disabled = true; // ปิดใช้งานตำบลถ้าไม่มีข้อมูล
        return; // ออกจากฟังก์ชัน
    }

    // เติมข้อมูลตำบลลงใน dropdown
    populateSelect(subdistrictSelect, amphure.tambon, 'name_th', 'name_th', '-- เลือกตำบล --');
    console.log("Dropdown ตำบลโหลดข้อมูลแล้ว");
}

// --- Logic สำหรับการอัปโหลดรูปภาพหลายรูปและแสดง Preview ---
// (โค้ดส่วนนี้ยังคงเหมือนเดิม เพราะทำงานได้ถูกต้องแล้ว)
const imagesInput = document.getElementById('images');
const imagePreviewContainer = document.getElementById('imagePreview');
const customFileLabel = document.querySelector('.custom-file-label');

imagesInput.addEventListener('change', function(e) {
    let fileName = '';
    imagePreviewContainer.innerHTML = ''; // ล้าง preview เดิม

    if (this.files && this.files.length > 0) {
        fileName = Array.from(this.files).map(file => file.name).join(', ');
        for (let i = 0; i < Math.min(this.files.length, 5); i++) {
            const file = this.files[i];
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.alt = file.name;
                imagePreviewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    } else {
        fileName = 'เลือกไฟล์...';
    }
    customFileLabel.innerText = fileName;
});


// **Event Listeners:**
// รอให้ HTML โหลดเสร็จก่อนที่จะเริ่มทำงานกับ element ต่างๆ
document.addEventListener('DOMContentLoaded', async () => {
    // โหลดข้อมูล JSON ทั้งหมดพร้อมกันเมื่อ DOM โหลดเสร็จ
    await Promise.all([
        loadGeographies(), // โหลดข้อมูลภูมิภาค (จาก fdageo.json ผ่าน Flask route)
        loadFDAType(),      // โหลดข้อมูลประเภท FDA (จาก fdatype.json ใน static/thai-data)
        (async () => { // โหลดข้อมูลจังหวัด อำเภอ ตำบล (จาก api_province_with_amphure_tambon.json ใน static/thai-data)
            thaiGeoData = await fetchData('/fda_scan/static/thai-data/api_province_with_amphure_tambon.json', 'ไม่พบไฟล์ข้อมูลจังหวัด (api_province_with_amphure_tambon.json)');
            if (thaiGeoData.length > 0) {
                loadProvinces(); // เมื่อโหลดข้อมูลจังหวัดสำเร็จ ให้เรียกโหลดจังหวัด
            }
        })()
    ]);

    // Event listener สำหรับ dropdown จังหวัด (เมื่อมีการเปลี่ยนแปลงค่า)
    provinceSelect.addEventListener('change', (e) => {
        const provinceName = e.target.value; // ดึงค่าชื่อจังหวัดที่เลือก (เป็น string)
        
        // รีเซ็ตและปิดใช้งานอำเภอและตำบลทันทีที่จังหวัดเปลี่ยน
        districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ --</option>';
        districtSelect.disabled = true;
        subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';
        subdistrictSelect.disabled = true;

        if (provinceName) { // ถ้ามีการเลือกจังหวัด (ไม่ใช่ "-- เลือกจังหวัด --")
            loadAmphures(provinceName); // เรียกโหลดอำเภอ โดยส่งชื่อจังหวัดไป
        } else { // ถ้าเลือก "-- เลือกจังหวัด --"
            console.log("ไม่ได้เลือกจังหวัด.");
        }
    });

    // Event listener สำหรับ dropdown อำเภอ (เมื่อมีการเปลี่ยนแปลงค่า)
    districtSelect.addEventListener('change', (e) => {
        const provinceName = provinceSelect.value; // ดึงค่าชื่อจังหวัดที่เลือกไว้ (เป็น string)
        const districtName = e.target.value;     // ดึงค่าชื่ออำเภอที่เลือก (เป็น string)
        
        // รีเซ็ตและปิดใช้งานตำบลทันทีที่อำเภอเปลี่ยน
        subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล --</option>';
        subdistrictSelect.disabled = true;

        if (districtName) { // ถ้ามีการเลือกอำเภอ
            loadTambons(provinceName, districtName); // เรียกโหลดตำบล โดยส่งชื่อจังหวัดและชื่ออำเภอไป
        } else { // ถ้าเลือก "-- เลือกอำเภอ --"
            console.log("ไม่ได้เลือกอำเภอ.");
        }
    });
});
