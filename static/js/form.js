        document.addEventListener('DOMContentLoaded', function() {
            // โค้ดสำหรับ Dropdown ต่างๆ (โค้ดเดิม)
            const geographySelect = document.getElementById('com_geographies');
            const provinceSelect = document.getElementById('province');
            const districtSelect = document.getElementById('district');
            const subdistrictSelect = document.getElementById('subdistrict');
            const fdaTypeSelect = document.getElementById('fdatype');

            // START: แก้ไข ลบตัวแปรของ hidden input ที่ไม่ใช้ออก
            // const geographyNameInput = document.getElementById('com_geographies_name');
            // const provinceNameInput = document.getElementById('province_name');
            // const districtNameInput = document.getElementById('district_name');
            // const subdistrictNameInput = document.getElementById('subdistrict_name');
            // END: แก้ไข

            const complaintForm = document.getElementById('complaint-form');
            const loadingOverlay = document.getElementById('loading-overlay');
            const progressCircle = document.getElementById('progress-circle');
            const progressPercent = document.getElementById('progress-percent');
            
            function populateDropdown(selectElement, data, placeholder) {
                selectElement.innerHTML = `<option value="">${placeholder}</option>`;
                data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name_th || item.name;
                    selectElement.appendChild(option);
                });
                selectElement.disabled = false;
            }

            fetch('/fda_scan/static/thai-data/fdatype.json')
                .then(response => response.json())
                .then(data => {
                    populateDropdown(fdaTypeSelect, data, 'เลือกหมวดหมู่');
                })
                .catch(error => console.error('Error loading FDA types:', error));

            fetch('/fda_scan/get_geographies')
                .then(response => response.json())
                .then(data => {
                    populateDropdown(geographySelect, data, 'เลือกภูมิภาค');
                })
                .catch(error => console.error('Error loading geographies:', error));

            geographySelect.addEventListener('change', function() {
                const selectedGeogId = this.value;
                // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                // const selectedGeogName = this.options[this.selectedIndex].textContent;
                // geographyNameInput.value = selectedGeogName;
                // END: แก้ไข

                if (selectedGeogId) {
                    fetch(`/fda_scan/get_provinces/${selectedGeogId}`)
                        .then(response => response.json())
                        .then(data => {
                            populateDropdown(provinceSelect, data, '-- เลือกจังหวัด --');
                            populateDropdown(districtSelect, [], '-- เลือกอำเภอ --');
                            districtSelect.disabled = true;
                            populateDropdown(subdistrictSelect, [], '-- เลือกตำบล --');
                            subdistrictSelect.disabled = true;
                            // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                            // provinceNameInput.value = '';
                            // districtNameInput.value = '';
                            // subdistrictNameInput.value = '';
                            // END: แก้ไข
                        })
                        .catch(error => console.error('Error loading provinces:', error));
                } else {
                    populateDropdown(provinceSelect, [], '-- เลือกจังหวัด --');
                    provinceSelect.disabled = true;
                    populateDropdown(districtSelect, [], '-- เลือกอำเภอ --');
                    districtSelect.disabled = true;
                    populateDropdown(subdistrictSelect, [], '-- เลือกตำบล --');
                    subdistrictSelect.disabled = true;
                    // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                    // geographyNameInput.value = '';
                    // provinceNameInput.value = '';
                    // districtNameInput.value = '';
                    // subdistrictNameInput.value = '';
                    // END: แก้ไข
                }
            });

            provinceSelect.addEventListener('change', function() {
                const selectedProvinceId = this.value;
                // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                // const selectedProvinceName = this.options[this.selectedIndex].textContent;
                // provinceNameInput.value = selectedProvinceName;
                // END: แก้ไข

                if (selectedProvinceId) {
                    fetch(`/fda_scan/get_amphures/${selectedProvinceId}`)
                        .then(response => response.json())
                        .then(data => {
                            populateDropdown(districtSelect, data, '-- เลือกอำเภอ --');
                            populateDropdown(subdistrictSelect, [], '-- เลือกตำบล --');
                            subdistrictSelect.disabled = true;
                            // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                            // districtNameInput.value = '';
                            // subdistrictNameInput.value = '';
                            // END: แก้ไข
                        })
                        .catch(error => console.error('Error loading amphures:', error));
                } else {
                    populateDropdown(districtSelect, [], '-- เลือกอำเภอ --');
                    districtSelect.disabled = true;
                    populateDropdown(subdistrictSelect, [], '-- เลือกตำบล --');
                    subdistrictSelect.disabled = true;
                    // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                    // provinceNameInput.value = '';
                    // districtNameInput.value = '';
                    // subdistrictNameInput.value = '';
                    // END: แก้ไข
                }
            });

            districtSelect.addEventListener('change', function() {
                const selectedDistrictId = this.value;
                // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                // const selectedDistrictName = this.options[this.selectedIndex].textContent;
                // districtNameInput.value = selectedDistrictName;
                // END: แก้ไข

                if (selectedDistrictId) {
                    fetch(`/fda_scan/get_tambons/${selectedDistrictId}`)
                        .then(response => response.json())
                        .then(data => {
                            populateDropdown(subdistrictSelect, data, '-- เลือกตำบล --');
                            // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                            // subdistrictNameInput.value = '';
                            // END: แก้ไข
                        })
                        .catch(error => console.error('Error loading tambons:', error));
                } else {
                    populateDropdown(subdistrictSelect, [], '-- เลือกตำบล --');
                    subdistrictSelect.disabled = true;
                    // START: แก้ไข ลบบรรทัดที่เกี่ยวกับ hidden input ออก
                    // districtNameInput.value = '';
                    // subdistrictNameInput.value = '';
                    // END: แก้ไข
                }
            });

            // START: แก้ไข ลบ event listener ของ subdistrict ที่ไม่จำเป็นแล้ว
            // subdistrictSelect.addEventListener('change', function() {
            //     const selectedOption = this.options[this.selectedIndex];
            //     const selectedSubdistrictName = selectedOption.textContent;
            //     subdistrictNameInput.value = selectedSubdistrictName;
            // });
            // END: แก้ไข
            
            // --- ส่วนอัปโหลดรูปภาพ (โค้ดเดิม) ---
            const imageUploadArea = document.getElementById('imageUploadArea');
            let uploadedFiles = [];
            const maxImages = 5;
            
            const scannedImageHiddenInput = document.getElementById('scanned_image_hidden_input');
            const scannedImageFilename = scannedImageHiddenInput ? scannedImageHiddenInput.value : null;

            if (scannedImageFilename) {
                uploadedFiles.push(scannedImageFilename);
            }
            
            function renderUploadElements() {
                imageUploadArea.innerHTML = '';
                
                uploadedFiles.forEach((file, index) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'file-upload-preview-item';
                    
                    let imageUrl = '';
                    if (typeof file === 'string') {
                        imageUrl = `/fda_scan/images/${file}`;
                    } else {
                        imageUrl = URL.createObjectURL(file);
                    }
                    
                    previewItem.innerHTML = `<img src="${imageUrl}" alt="Preview">
                                              <span class="remove-btn" data-index="${index}">&times;</span>`;
                    imageUploadArea.appendChild(previewItem);
                });
                
                if (uploadedFiles.length < maxImages) {
                    const fileInputId = `image_input_${uploadedFiles.length}`;
                    const plusIcon = document.createElement('label');
                    plusIcon.setAttribute('for', fileInputId);

                    

                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.className = 'file-input';
                    fileInput.id = fileInputId;
                    fileInput.name = 'images[]';
                    fileInput.accept = 'image/*';
                    fileInput.multiple = 'multiple';

                    imageUploadArea.appendChild(plusIcon);
                    imageUploadArea.appendChild(fileInput);
                }
            }

            function updateHiddenInputs() {
                const form = document.querySelector('form');
                const existingHiddenInputs = form.querySelectorAll('input[name="images[]"][type="hidden"]');
                existingHiddenInputs.forEach(input => form.removeChild(input));
                
                uploadedFiles.forEach(file => {
                    if (typeof file === 'string') {
                        const hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.name = 'images[]';
                        hiddenInput.value = file;
                        form.appendChild(hiddenInput);
                    }
                });
            }

            imageUploadArea.addEventListener('click', function(e) {
                if (e.target.classList.contains('remove-btn')) {
                    const index = e.target.getAttribute('data-index');
                    uploadedFiles.splice(index, 1);
                    renderUploadElements();
                }
            });

            document.querySelector('form').addEventListener('change', function(e) {
                if (e.target.type === 'file' && e.target.files.length > 0 && e.target.name === 'images[]') {
                    const files = Array.from(e.target.files);
                    const newFiles = files.slice(0, maxImages - uploadedFiles.length);
                    
                    newFiles.forEach(file => {
                        uploadedFiles.push(file);
                    });
                    
                    renderUploadElements();
                }
            });

            renderUploadElements();

            const phoneInput = document.getElementById('com_tel');
            phoneInput.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 10) {
                    value = value.slice(0, 10);
                }
                
                let formattedValue = '';
                if (value.length > 6) {
                    formattedValue = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
                } else if (value.length > 3) {
                    formattedValue = `${value.slice(0, 3)}-${value.slice(3)}`;
                } else {
                    formattedValue = value;
                }
                e.target.value = formattedValue;
            });

            // โค้ดสำหรับ \"เพิ่มรูปที่ต้องการรายงาน\" (โค้ดเดิม)
            const reportImageUploadArea = document.getElementById('reportImageUploadArea');
            let reportUploadedFiles = []; 
            const maxReportImages = 4;

            function renderReportUploadElements() {
                reportImageUploadArea.innerHTML = '';
                
                reportUploadedFiles.forEach((file, index) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'file-upload-preview-item';
                    const imageUrl = URL.createObjectURL(file);
                    
                    previewItem.innerHTML = `<img src="${imageUrl}" alt="Report Preview">
                                              <span class="remove-btn report-remove-btn" data-index="${index}">&times;</span>`;
                    reportImageUploadArea.appendChild(previewItem);
                });
                
                if (reportUploadedFiles.length < maxReportImages) {
                    const fileInputId = `report_image_input_${reportUploadedFiles.length}`;
                    const plusIcon = document.createElement('label');
                    plusIcon.setAttribute('for', fileInputId);
                    plusIcon.className = 'file-upload-plus-icon';
                    plusIcon.innerHTML = `<span class="plus-icon">+</span>`;

                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.className = 'file-input';
                    fileInput.id = fileInputId;
                    fileInput.name = 'report_images_temp'; 
                    fileInput.accept = 'image/*';
                    fileInput.multiple = true; 

                    reportImageUploadArea.appendChild(plusIcon);
                    reportImageUploadArea.appendChild(fileInput);
                }
            }

            reportImageUploadArea.addEventListener('change', function(e) {
                if (e.target.type === 'file' && e.target.files.length > 0) {
                    const files = Array.from(e.target.files);
                    const spaceLeft = maxReportImages - reportUploadedFiles.length;
                    
                    if (files.length > spaceLeft) {
                        alert(`คุณสามารถเพิ่มรูปได้อีก ${spaceLeft} รูปเท่านั้น`);
                    }

                    const newFiles = files.slice(0, spaceLeft);
                    
                    newFiles.forEach(file => {
                        reportUploadedFiles.push(file);
                    });
                    
                    renderReportUploadElements();
                }
            });

            reportImageUploadArea.addEventListener('click', function(e) {
                if (e.target.classList.contains('report-remove-btn')) {
                    const index = parseInt(e.target.getAttribute('data-index'), 10);
                    reportUploadedFiles.splice(index, 1);
                    renderReportUploadElements();
                }
            });

            renderReportUploadElements();


            // จัดการ Form Submission
            document.querySelector('form').addEventListener('submit', function(e) {
                updateHiddenInputs();

                const tempInputs = document.querySelectorAll('input[name="report_images_temp"]');
                tempInputs.forEach(input => input.remove());
                
                const dataTransfer = new DataTransfer();
                reportUploadedFiles.forEach(file => {
                    dataTransfer.items.add(file);
                });

                const finalReportInput = document.createElement('input');
                finalReportInput.type = 'file';
                finalReportInput.name = 'report_images';
                finalReportInput.files = dataTransfer.files;
                finalReportInput.style.display = 'none';
                finalReportInput.multiple = true;

                this.appendChild(finalReportInput);
            });
            
            // --- โค้ดใหม่สำหรับปรับความสูง Textarea อัตโนมัติ ---
            const fdaDataTextarea = document.getElementById('com_fda_data');

            function adjustTextareaHeight(textarea) {
                if (textarea) {
                    textarea.style.height = 'auto'; 
                    textarea.style.height = (textarea.scrollHeight) + 'px';
                }
            }

            adjustTextareaHeight(fdaDataTextarea);
            
            complaintForm.addEventListener('submit', function(event) {
                if (!complaintForm.checkValidity()) {
                    complaintForm.reportValidity();
                    event.preventDefault();
                    return;
                }

                event.preventDefault(); 
                loadingOverlay.style.display = 'flex'; 

                let progress = 0;
                const interval = setInterval(() => {
                    if (progress < 99) {
                        progress++;
                        progressPercent.textContent = `${progress}%`;
                        progressCircle.style.background = `conic-gradient(#007bff ${progress * 3.6}deg, #e9ecef ${progress * 3.6}deg)`;
                    } else {
                        clearInterval(interval);
                    }
                }, 150);

                setTimeout(() => {
                    complaintForm.submit(); 
            }, 500);
            });
        });
