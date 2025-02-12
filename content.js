let popup = null;

document.addEventListener("mouseup", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  // Check if extension is enabled
  const { isEnabled = true } = await chrome?.storage?.sync.get("isEnabled");
  if (!isEnabled) return;

  // Check if current page is allowed
  const { allowedPages = [] } = await chrome?.storage?.sync.get("allowedPages");
  const currentUrl = window.location.href;

  // Check if any allowed page pattern matches the current URL
  const isAllowed = allowedPages.some(
    (pattern) =>
      currentUrl.includes(pattern) ||
      new RegExp(pattern.replace(/\*/g, ".*")).test(currentUrl)
  );

  if (!isAllowed) {
    return;
  }

  // check if click popup
  if (popup) {
    return;
  }
  const selectedText = window.getSelection().toString().trim();

  if (popup) {
    document.body.removeChild(popup);
    popup = null;
  }

  if (selectedText) {
    popup = document.createElement("div");
    popup.className = "translation-popup";

    // Add draggable functionality
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    popup.addEventListener("mousedown", (e) => {
      if (
        e.target.className !== "close-btn" &&
        !e.target.closest(".copy-btn")
      ) {
        isDragging = true;
        initialX = e.clientX - popup.offsetLeft;
        initialY = e.clientY - popup.offsetTop;
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        popup.style.left = `${currentX}px`;
        popup.style.top = `${currentY}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Make popup position absolute for dragging
    popup.style.position = "fixed";
    popup.style.cursor = "move";
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    console.log(rect, 1);
    console.log(popup.offsetHeight);
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.top + 30 + popup.offsetHeight}px`;
    // popup.style.left = `${rect.left + window.scrollX}px`;
    // popup.style.top = `${rect.top + window.scrollY - 10}px`;

    const closeBtn = document.createElement("span");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => {
      document.body.removeChild(popup);
      popup = null;
    };

    const content = document.createElement("div");
    content.className = "translation-content";

    // Hiển thị từ gốc
    const originalWord = document.createElement("div");
    originalWord.className = "original-word";
    originalWord.textContent = selectedText;

    // Hiển thị loading
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "loading";
    loadingDiv.textContent = "Đang dịch...";

    // Khu vực hiển thị kết quả
    const resultDiv = document.createElement("div");
    resultDiv.className = "translation-result";

    content.appendChild(originalWord);
    content.appendChild(loadingDiv);
    content.appendChild(resultDiv);

    popup.appendChild(closeBtn);
    popup.appendChild(content);
    document.body.appendChild(popup);

    try {
      // Use MyMemory Translation API instead of Lingva
      const [translatedText, pronunciation] = await Promise.all([
        fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            selectedText
          )}&langpair=en|vi`
        ),
        getPronunciation(selectedText),
      ]);
      const data = await translatedText.json();

      if (data.responseData?.translatedText) {
        const translatedText = data.responseData.translatedText;
        loadingDiv.style.display = "none";

        resultDiv.innerHTML = `
          <div class="translation">
            <div class="meaning">${translatedText}</div>
             <button style="color:rgb(235, 51, 76); cursor: pointer;" class="audio-btn" type="button">
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </button>
            <div class="pronunciation-container">
              <div class="pronunciation">${pronunciation}</div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button style="background-color: #007bff; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; width: 100px; display: flex; align-items: center; justify-content: center; gap: 5px;" class="copy-btn btn btn-primary" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
              <button style="background-color: #28a745; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; width: 100px; display: flex; align-items: center; justify-content: center; gap: 5px;" class="save-btn btn btn-success" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save
              </button>
            </div>
          </div>
        `;

        // Add audio playback functionality
        const audioBtn = resultDiv.querySelector(".audio-btn");
        audioBtn.addEventListener("click", () => {
          try {
            const utterance = new SpeechSynthesisUtterance(selectedText);
            utterance.lang = "en-US";
            speechSynthesis.speak(utterance);
          } catch (err) {
            console.error("Failed to play audio:", err);
          }
        });

        // Thêm sự kiện click cho nút copy
        const copyBtn = resultDiv.querySelector(".copy-btn");
        console.log(copyBtn, 343);
        copyBtn.addEventListener("click", async () => {
          console.log("copyBtn clicked");
          try {
            const textToCopy = `${translatedText}\n${pronunciation}`;
            await navigator.clipboard.writeText(textToCopy);
            copyBtn.textContent = "Copied!";
            copyBtn.classList.add("copied");

            // Reset nút sau 2 giây
            setTimeout(() => {
              copyBtn.innerHTML = `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                Copy
                            `;
              copyBtn.classList.remove("copied");
            }, 2000);
          } catch (err) {
            copyBtn.textContent = "Copy failed";
            copyBtn.classList.add("error");
          }
        });

        // Add save functionality
        const saveBtn = resultDiv.querySelector(".save-btn");
        saveBtn.addEventListener("click", async () => {
          try {
            const wordToSave = {
              original: selectedText,
              translation: translatedText,
              pronunciation: pronunciation,
              timestamp: new Date().toISOString(),
            };

            const { savedWords = [] } = await chrome.storage.sync.get(
              "savedWords"
            );
            savedWords.push(wordToSave);
            await chrome.storage.sync.set({ savedWords });

            saveBtn.textContent = "Saved!";
            saveBtn.style.backgroundColor = "#218838";

            setTimeout(() => {
              saveBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save
              `;
              saveBtn.style.backgroundColor = "#28a745";
            }, 2000);
          } catch (err) {
            saveBtn.textContent = "Error!";
            saveBtn.style.backgroundColor = "#dc3545";
          }
        });
      } else {
        throw new Error("Translation failed");
      }
    } catch (error) {
      loadingDiv.textContent = "Có lỗi xảy ra khi dịch";
    }
  }
});

document.addEventListener("mousedown", (e) => {
  if (popup && !popup.contains(e.target)) {
    document.body.removeChild(popup);
    popup = null;
  }
});

// Hàm lấy phiên âm (sử dụng từ điển có sẵn hoặc API khác)
async function getPronunciation(text) {
  // Tách text thành các từ riêng lẻ
  const words = text.split(/\s+/);

  // Create array of promises for each word
  const pronunciationPromises = words.map(async (word) => {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          word
        )}`
      );
      const data = await response.json();
      return data?.[0]?.phonetics?.[0]?.text || word;
    } catch (error) {
      return word;
    }
  });

  // Wait for all promises to resolve
  const pronunciations = await Promise.all(pronunciationPromises);
  return pronunciations.join(" ");
}
