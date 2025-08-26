"use strict";

const zipFileInputEl = document.getElementById("zipFileInput");
const enableRenamingCheckboxEl = document.getElementById(
  "enableRenamingCheckbox"
);
const processBtnEl = document.getElementById("processButton");

const statisticsEl = document.querySelector(".statistics");
const totalCountEl = document.querySelector(".total-count");
const deleteCountEl = document.querySelector(".delete-count");
const finalCountEl = document.querySelector(".final-count");

const imageListEl = document.querySelector(".image-list");

let zipFile;
let zip;
const imageObjList = [];
let deleteCount = 0;

function setOperationDisabled(b) {
  zipFileInputEl.disabled = b;
  processBtnEl.disabled = b;
  enableRenamingCheckboxEl.disabled = b;
}

function init() {
  imageObjList.splice(0);
  deleteCount = 0;
  imageListEl.innerHTML = "";
}

function initSortable() {
  new Sortable(imageListEl, {
    ghostClass: "sortable-ghost",
    onEnd: e => {
      if (e.oldIndex === e.newIndex) {
        return;
      }
      const thumbnailEl = e.item;
      thumbnailEl.classList.add("moved");
      const newOrder = {};

      [...e.to.children].forEach((div, i) => {
        newOrder[div.dataset.filename] = i;
      });

      imageObjList.sort(
        (o1, o2) => newOrder[o1.filename] - newOrder[o2.filename]
      );
    },
  });
}

function handleFileSelect(event) {
  zipFile = event.target.files[0];
  if (!zipFile) {
    return;
  }
  setOperationDisabled(true);
  init();
  const reader = new FileReader();

  reader.onload = async function (e) {
    zip = await JSZip.loadAsync(e.target.result);
    const filenames = Object.keys(zip.files);
    filenames.sort();

    filenames.forEach(f => {
      const obj = {
        filename: f,
        deleted: false,
      };
      imageObjList.push(obj);
    });
    renderThumbnails();
    renderStatistics();
    setOperationDisabled(false);
  };

  reader.readAsArrayBuffer(zipFile);
  initSortable();
}

function renderStatistics() {
  const total = Object.keys(zip.files).length;
  totalCountEl.textContent = total;
  deleteCountEl.textContent = deleteCount;
  finalCountEl.textContent = total - deleteCount;

  statisticsEl.classList.remove("hidden");
}

async function renderThumbnails() {
  const tasks = imageObjList.map(async function ({ filename, deleted }) {
    const blob = await zip.files[filename].async("blob");
    const url = URL.createObjectURL(blob);
    const html = `
      <div 
          class="thumbnail ${deleted ? "deleted" : ""}"
          title="${filename}"
          data-filename="${filename}"
      >
        <img src="${url}" />
      </div>
    `;
    return html;
  });

  const html = (await Promise.all(tasks)).join("");
  imageListEl.innerHTML = html;
}

async function handleProcessZipFile() {
  if (!zipFile) {
    return alert("Choose a zip file first.");
  }

  const choice = confirm("Download the processed zip file?");
  if (!choice) {
    return;
  }
  setOperationDisabled(true);
  const newZip = new JSZip();

  const renaming = enableRenamingCheckboxEl.checked;
  const finalCountDigits = (Object.keys(zip.files).length - deleteCount + "")
    .length;

  const tasks = imageObjList
    .filter(o => !o.deleted)
    .map(async ({ filename }, i) => {
      const blob = zip.files[filename].async("blob");
      // TODO: when renaming enabled, change the filename
      if (renaming) {
        const ext = filename.split(".").at(-1);
        const newFilename = `${(i + 1 + "").padStart(
          finalCountDigits,
          "0"
        )}.${ext}`;
        newZip.file(newFilename, blob);
      } else {
        newZip.file(filename, blob);
      }
    });

  await Promise.all(tasks);

  const content = await newZip.generateAsync({ type: "blob" });
  saveAs(content, zipFile.name);
  setOperationDisabled(false);
}

function handleClickImageList(e) {
  const thumbnailEl = e.target.closest(".thumbnail");
  if (!thumbnailEl) {
    return;
  }

  const imgObj = imageObjList.find(
    o => o.filename === thumbnailEl.dataset.filename
  );
  imgObj.deleted = !imgObj.deleted;
  thumbnailEl.classList.toggle("deleted");

  if (imgObj.deleted) {
    deleteCount++;
  } else {
    deleteCount--;
  }
  renderStatistics();
}

zipFileInputEl.addEventListener("change", handleFileSelect);
processBtnEl.addEventListener("click", handleProcessZipFile);
imageListEl.addEventListener("click", handleClickImageList);
