document.getElementById('zipFileInput').addEventListener('change', handleFileSelect);
document.getElementById('processButton').addEventListener('click', processZipFile);

let zipFile;
let zip;
let imageList = document.getElementById('imageList');

function handleFileSelect(event) {
    zipFile = event.target.files[0];
    if (zipFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            JSZip.loadAsync(e.target.result).then(function (zipContent) {
                zip = zipContent;
                displayImages();
            });
        };
        reader.readAsArrayBuffer(zipFile);
    }
}

function displayImages() {
    imageList.innerHTML = '';
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';

    const filenames = Object.keys(zip.files);
    filenames.sort();

    filenames.forEach(function (filename) {
        const thumbnail = document.createElement('div');
        thumbnail.style.textAlign = 'center';

        const img = document.createElement('img');
        img.style.maxWidth = '200px'; // Limit maximum width for smaller screens
        img.style.maxHeight = '200px'; // Limit maximum height for smaller screens
        img.style.objectFit = 'cover';
        img.style.border = '2px solid black'; 

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'imageCheckbox';
        checkbox.setAttribute('data-filename', filename);

        thumbnail.appendChild(img);
        thumbnail.appendChild(checkbox);
        row.appendChild(thumbnail);

        zip.files[filename].async('blob').then(function (blob) {
            const url = URL.createObjectURL(blob);
            img.src = url;
        });
    });

    imageList.appendChild(row);
}

function processZipFile() {
    if (zipFile == null) {
        alert('no zip file')
    }
    const checkboxes = document.querySelectorAll('.imageCheckbox');
    const newZip = new JSZip();
    const promises = [];

    checkboxes.forEach(checkbox => {
        const filename = checkbox.getAttribute('data-filename');
        if (!checkbox.checked) {
            const promise = zip.files[filename].async('blob').then(blob => {
                newZip.file(filename, blob);
            });
            promises.push(promise);
        }
    });

    Promise.all(promises).then(() => {
        newZip.generateAsync({ type: 'blob' }).then(content => {
            saveAs(content, zipFile.name);
        });
    });
}

