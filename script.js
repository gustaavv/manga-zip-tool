document.getElementById('zipFileInput').addEventListener('change', handleFileSelect);
document.getElementById('processButton').addEventListener('click', processZipFile);

let zipFile;
let zip;
let imageList = document.getElementById('imageList');
var deleteCount = 0;
var deleteList = [];

function initVariables() {
    imageList.innerHTML = '';
    deleteCount = 0;
    deleteList = [];
}

function showDeleteInfo() {
    document.getElementById("deleteCount").innerText = deleteCount;

    document.getElementById("deleteList").innerText = deleteList.join(", ");
}

function handleFileSelect(event) {
    zipFile = event.target.files[0];
    if (zipFile) {
        document.getElementById('msg1').style.display = 'block';

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
    const promises = [];
    initVariables()
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';

    const filenames = Object.keys(zip.files);
    filenames.sort();

    filenames.forEach(function (filename) {
        const thumbnail = document.createElement('div');
        thumbnail.style.textAlign = 'center';
        thumbnail.style.margin = '10px'; // Add some margin around each thumbnail

        const img = document.createElement('img');
        img.style.maxWidth = '200px'; // Limit maximum width for smaller screens
        img.style.maxHeight = '200px'; // Limit maximum height for smaller screens
        img.style.objectFit = 'cover';
        img.style.border = '2px solid black';
        img.setAttribute('data-filename', filename);
        img.className = 'imageThumbnail';
        img.title = filename;

        thumbnail.appendChild(img);
        row.appendChild(thumbnail);

        const promise = zip.files[filename].async('blob').then(function (blob) {
            const url = URL.createObjectURL(blob);
            img.src = url;
            // Click event listener to toggle 'checked' class
            img.addEventListener('click', function () {
                if (img.classList.contains('checked')) {
                    img.classList.remove('checked');
                    img.style.border = '2px solid black';
                    deleteCount--;
                    deleteList = deleteList.filter(e => e !== filename).sort();
                } else {
                    img.classList.add('checked');
                    img.style.border = '4px solid red';
                    deleteCount++;
                    deleteList.push(filename);
                    deleteList.sort();
                }
                showDeleteInfo();
            });
        });
        promises.push(promise);
    });


    Promise.all(promises).then(() => {
        imageList.appendChild(row);
        document.getElementById('msg1').style.display = 'none';
    });

}

function processZipFile() {
    if (zipFile == null) {
        alert('no zip file')
    }
    const checkedImages = document.querySelectorAll('.imageThumbnail');
    const newZip = new JSZip();
    const promises = [];

    checkedImages.forEach(function (img) {
        const filename = img.getAttribute('data-filename');
        if (!img.classList.contains('checked')) {
            const promise = zip.files[filename].async('blob').then(function (blob) {
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

