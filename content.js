// The crawlLaban function will be available globally

let popup = null;

document.addEventListener("mouseup", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  try {
    // Check if extension is enabled
    const { isEnabled = true } = await chrome?.storage?.sync?.get("isEnabled") || { isEnabled: true };
    if (!isEnabled) return;

    // Check if current page is allowed
    const { allowedPages = [] } = await chrome?.storage?.sync.get("allowedPages") || { allowedPages: [] };
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
  } catch (error) {
    console.warn('Failed to check extension state:', error);
    return; // Exit gracefully if we can't verify extension state
  }

  // check if click popup
  if (popup) {
    return;
  }
  const selectedText = window.getSelection().toString().trim();

  if (popup) {
    window.getSelection().removeAllRanges();
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
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${rect.top + 30 + popup.offsetHeight}px`;
    // popup.style.left = `${rect.left + window.scrollX}px`;
    // popup.style.top = `${rect.top + window.scrollY - 10}px`;

    const closeBtn = document.createElement("span");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => {
      // remove selected text
      window.getSelection().removeAllRanges();
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
    } catch (error) {
      loadingDiv.textContent = "Có lỗi xảy ra khi dịch";
    }
  }
});

document.addEventListener("mousedown", (e) => {
  if (popup && !popup.contains(e.target)) {
    window.getSelection().removeAllRanges();
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

// Tạo MutationObserver để theo dõi thay đổi DOM
const observer = new MutationObserver(async (mutations) => {
  // if not allowed page, return
  const { allowedPages = [] } = await chrome?.storage?.sync.get("allowedPages");
  const currentUrl = window.location.href;
  const isAllowed = allowedPages.some(
    (pattern) =>
      currentUrl.includes(pattern) ||
      new RegExp(pattern.replace(/\*/g, ".*")).test(currentUrl)
  );
  if (!isAllowed) {
    return;
  }

  mutations.forEach(() => {
    const editableElements = document.querySelectorAll(
      '[contenteditable="true"]'
    );
    console.log(editableElements.length, "INPUT");
    editableElements.forEach((element) => {
      // Kiểm tra xem element đã có event listener chưa
      if (!element.hasAttribute("data-has-listener")) {
        element.setAttribute("data-has-listener", "true");

        element.addEventListener(
          "input",
          debounce(async (e) => {
            const inputText = e.target.textContent.trim();
            if (!inputText) return;

            try {
              const response = await fetch(
                `https://dict.laban.vn/ajax/autocomplete?type=1&site=dictionary&query=${encodeURIComponent(
                  inputText
                )}`
              );
              const data = await response.json();
              const suggestions = data.suggestions || [];
              console.log("SUGGESTIONS", suggestions);
              showSuggestionPopup(suggestions, e.target);
            } catch (error) {
              console.error("Error fetching suggestions:", error);
            }
          }, 300)
        );
      }
    });
  });
});

// Cấu hình observer
const config = {
  childList: true,
  subtree: true,
};

// Bắt đầu theo dõi
observer.observe(document.body, config);

function showSuggestionPopup(suggestions, targetElement) {
  if (popup) {
    document.body.removeChild(popup);
    popup = null;
  }

  popup = document.createElement("div");
  popup.className = "suggestion-popup";
  popup.style.position = "fixed";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.gap = "4px";

  const rect = targetElement.getBoundingClientRect();
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.top + 30 + popup.offsetHeight}px`;
  console.log(rect, popup.offsetHeight, "RECT");
  
  suggestions.forEach((suggestion) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    
    // Tạo một div tạm thời để parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = suggestion.data;
    
    // Lấy thẻ a và rel của nó
    const linkElement = tempDiv.querySelector('a');
    const relValue = linkElement?.getAttribute('rel') || '';
    
    // Tạo content div mới và copy nội dung từ thẻ a
    const content = document.createElement("div");
    content.innerHTML = linkElement.innerHTML;
    item.appendChild(content);
    
    // Lưu rel value vào data attribute của item
    item.dataset.rel = relValue;

    item.addEventListener("click", async () => {
      targetElement.textContent = suggestion.select;
      
      try { 
        const translate = await crawlLaban(item.dataset.rel);
        console.log(translate, "TRANSLATE");
        if (!!translate.datas.length) {
          handleAutoTranslate(translate, targetElement);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
      document.body.removeChild(popup);
      popup = null;
    });

    popup.appendChild(item);
  });

  document.body.appendChild(popup);
}

// Debounce helper function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function handleAutoTranslate(data, targetElement) {
  const { pronunciation, datas } = data;
  const flashcardCard = targetElement.closest('[id*="flashcardCard-"]');
  if (flashcardCard) {
    const nextElement = flashcardCard.querySelectorAll('[contenteditable="true"]')?.[1];
    if (nextElement) {
      // Create the list structure
      const pronunciationP = document.createElement('p');
      pronunciationP.innerHTML = `<strong><span class="selection" style="color:rgb(128, 20, 230);font-weight: bold;"> 🔊${pronunciation}</span></strong>`;
      const ul = document.createElement('ul');
      datas.forEach(data => {
        const li = document.createElement('li');
        
        // Type (Danh từ)
        const typeP = document.createElement('p');
        const typeSpan = document.createElement('span');
        typeSpan.style.color = '#509451';
        typeSpan.innerHTML = `<strong>${data.type}</strong>`;
        typeP.appendChild(typeSpan);
        li.appendChild(typeP);
        
        // Description
        const descP = document.createElement('p');
        if (data.description) {
          descP.innerHTML = `<strong><span class="selection"> 📒${data.description}</span></strong>`;
        }
        li.appendChild(descP);
        
        // Meanings
        data.meanings.forEach(meaningObj => {
          // Meaning
          const meaningP = document.createElement('p');
          meaningP.innerHTML = `<strong><em><span class="selection" style="color: #3472ad">✅ ${meaningObj.meaning}</span></em></strong>`;
          li.appendChild(meaningP);
          
          // Examples
          meaningObj.examples.forEach(example => {
            // English example
            const enP = document.createElement('p');
            enP.innerHTML = `<span style="color:rgb(158, 59, 142)" class="selection">👮‍♀️ ${example.en}</span>`;
            li.appendChild(enP);
            
            // Vietnamese example
            const viP = document.createElement('p');
            viP.innerHTML = `<span class="selection" style="font-style: italic;">🦹‍♀️ ${example.vi}</span>`;
            li.appendChild(viP);
          });
        });
        
        // Add line breaks at the end
        li.appendChild(document.createElement('br'));
        li.appendChild(document.createElement('br'));
        
        ul.appendChild(li);
      });
      
      // Clear existing content and append the new structure
      nextElement.innerHTML = '';
      if (pronunciation) {
        nextElement.appendChild(pronunciationP);
      }
      nextElement.appendChild(ul);
    }
  }
}
