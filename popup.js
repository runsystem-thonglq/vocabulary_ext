document.addEventListener("DOMContentLoaded", async () => {
  // Load saved pages and extension state from storage
  const { allowedPages = [], isEnabled = true } = await chrome.storage.sync.get(
    ["allowedPages", "isEnabled"]
  );
  updatePagesList(allowedPages);

  // Set initial toggle state
  document.getElementById("extensionToggle").checked = isEnabled;

  // Handle toggle changes
  document
    .getElementById("extensionToggle")
    .addEventListener("change", async (e) => {
      await chrome.storage.sync.set({ isEnabled: e.target.checked });
    });

  // Add current page
  document.getElementById("addPageBtn").addEventListener("click", async () => {
    // Get current tab URL
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = new URL(tab.url).hostname;

    if (url) {
      const { allowedPages = [] } = await chrome.storage.sync.get(
        "allowedPages"
      );
      if (!allowedPages.includes(url)) {
        allowedPages.push(url);
        await chrome.storage.sync.set({ allowedPages });
        updatePagesList(allowedPages);
      }
    }
  });

  // Clear all pages
  document.getElementById("clearAllBtn").addEventListener("click", async () => {
    await chrome.storage.sync.set({ allowedPages: [] });
    updatePagesList([]);
  });

  // Add navigation handlers for saved words page
  document
    .getElementById("saveWordsBtn")
    .addEventListener("click", async () => {
      document.getElementById("mainPage").style.display = "none";
      document.getElementById("saveWordsPage").style.display = "block";

      const { savedWords = [] } = await chrome.storage.sync.get("savedWords");
      const savedWordsContainer = document.getElementById("savedWordsPage");
      savedWordsContainer.innerHTML = "";

      if (savedWords.length === 0) {
        savedWordsContainer.innerHTML =
          '<p class="text-muted">No saved words yet.</p>';
      } else {
        savedWords.forEach((word) => {
          const wordElement = document.createElement("div");
          wordElement.className = "saved-word-item";
          wordElement.innerHTML = `
            <div class="word-details">
              <strong>${word.original}</strong>
              <div style="font-size: 16px;font-weight: 500;"><small>${
                word.translation
              }</small></div>
              <div style="font-size: 16px;font-style: italic; color: #6c757d;font-weight: 400;"><small>${
                word.pronunciation
              }</small></div>
              <div style="font-size:12px;"><small>${new Date(
                word.timestamp
              ).toLocaleString()}</small></div>
            </div>
            <div class="word-actions">
              <button class="btn btn-sm btn-primary copy-word-btn" title="Copy word">
                <i class="fas fa-copy"></i> Copy
              </button>
              <button class="btn btn-sm btn-danger delete-word-btn">Delete</button>
            </div>
          `;

          // Xử lý copy từ
          wordElement
            .querySelector(".copy-word-btn")
            .addEventListener("click", () => {
              const textToCopy = `${word.original}\n${word.translation}\n${word.pronunciation}`;
              navigator.clipboard.writeText(textToCopy);

              const copyBtn = wordElement.querySelector(".copy-word-btn");
              const originalText = copyBtn.innerHTML;
              copyBtn.innerHTML = "Copied!";
              setTimeout(() => {
                copyBtn.innerHTML = originalText;
              }, 1000);
            });

          // Xử lý xóa từ
          wordElement
            .querySelector(".delete-word-btn")
            .addEventListener("click", async () => {
              const updatedWords = savedWords.filter(
                (w) => w.timestamp !== word.timestamp
              );
              await chrome.storage.sync.set({ savedWords: updatedWords });
              wordElement.remove();
              if (updatedWords.length === 0) {
                savedWordsContainer.innerHTML =
                  '<p class="text-muted">No saved words yet.</p>';
              }
            });

          savedWordsContainer.appendChild(wordElement);
        });
      }
    });

  document.getElementById("backToMainBtn").addEventListener("click", () => {
    document.getElementById("saveWordsPage").style.display = "none";
    document.getElementById("mainPage").style.display = "block";
  });
});

function updatePagesList(pages) {
  const listContainer = document.getElementById("allowedPages");
  listContainer.innerHTML = "";

  pages.forEach((page) => {
    const item = document.createElement("div");
    item.className =
      "list-group-item d-flex justify-content-between align-items-center";
    item.innerHTML = `
      <span>${page}</span>
      <button class="btn btn-sm btn-danger delete-btn">Remove</button>
    `;

    item.querySelector(".delete-btn").addEventListener("click", async () => {
      const { allowedPages = [] } = await chrome.storage.sync.get(
        "allowedPages"
      );
      const updatedPages = allowedPages.filter((p) => p !== page);
      await chrome.storage.sync.set({ allowedPages: updatedPages });
      updatePagesList(updatedPages);
    });

    listContainer.appendChild(item);
  });
}
