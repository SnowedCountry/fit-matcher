document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // YOUR OFFICIAL EBAY AFFILIATE ID
  // ==========================================
  const EBAY_CAMP_ID = "5339180426";

  // Tab Switching Logic
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add("active");
      if (btn.dataset.tab === "wishlistTab") renderWishlist();
    });
  });

  // Load Saved Measurements, Tolerance & Ignore Words
  const inputs = ["waist", "inseam", "chest", "shoulder", "sleeve"];
  chrome.storage.local.get(["measurements", "tolerance", "ignoreWords", "fitList"], (result) => {
    const user = result.measurements || {};
    inputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = user[id] || "";
    });
    if (result.tolerance !== undefined && document.getElementById("tolerance")) {
      document.getElementById("tolerance").value = result.tolerance;
    }
    if (document.getElementById("ignoreWords")) {
      document.getElementById("ignoreWords").value = result.ignoreWords || "";
    }
    updateWishCount(result.fitList || []);
  });

  // Save Measurements, Tolerance & Ignore Words
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const measurements = {};
      inputs.forEach((id) => {
        const val = parseFloat(document.getElementById(id).value);
        if (!isNaN(val)) measurements[id] = val;
      });
      const tolerance = parseFloat(document.getElementById("tolerance").value) || 1.5;
      const ignoreWords = document.getElementById("ignoreWords").value.trim();

      chrome.storage.local.set({ measurements, tolerance, ignoreWords }, () => {
        const status = document.getElementById("status");
        if (status) {
          status.textContent = "Saved! Refresh shopping tabs.";
          setTimeout(() => (status.textContent = ""), 2500);
        }
      });
    });
  }

  // ==========================================
  // SMART SEARCH GENERATOR
  // ==========================================
  function launchSearch(platformUrl, isEbay = false) {
    const keywordEl = document.getElementById("searchKeyword");
    const keyword = keywordEl ? keywordEl.value.trim() : "";

    chrome.storage.local.get(["measurements"], (result) => {
      const user = result.measurements || {};
      let terms = [keyword];

      const lowerKey = keyword.toLowerCase();
      if (lowerKey.includes("shirt") || lowerKey.includes("jacket") || lowerKey.includes("top") || lowerKey.includes("hoodie")) {
        if (user.chest) terms.push(`${user.chest} chest`);
      } else {
        if (user.waist && user.inseam) {
          terms.push(`${user.waist}x${user.inseam}`);
        } else if (user.waist) {
          terms.push(`W${user.waist}`);
        }
      }

      const fullQuery = encodeURIComponent(terms.filter(Boolean).join(" "));
      let finalUrl = platformUrl + fullQuery;

      // Automatically append your eBay Affiliate tracking tag
      if (isEbay) {
        finalUrl += `&_campid=${EBAY_CAMP_ID}&_toolid=10001`;
      }

      chrome.tabs.create({ url: finalUrl });
    });
  }

  // Attach Smart Search Button Click Listeners
  const ebayBtn = document.getElementById("searchEbay");
  if (ebayBtn) {
    ebayBtn.addEventListener("click", () => {
      launchSearch("https://www.ebay.com/sch/i.html?_nkw=", true);
    });
  }

  const googleBtn = document.getElementById("searchGoogle");
  if (googleBtn) {
    googleBtn.addEventListener("click", () => {
      launchSearch("https://www.google.com/search?tbm=shop&q=");
    });
  }

  const poshBtn = document.getElementById("searchPoshmark");
  if (poshBtn) {
    poshBtn.addEventListener("click", () => {
      launchSearch("https://poshmark.com/search?query=");
    });
  }

  const grailedBtn = document.getElementById("searchGrailed");
  if (grailedBtn) {
    grailedBtn.addEventListener("click", () => {
      launchSearch("https://www.grailed.com/shop?query=");
    });
  }

  // ==========================================
  // FITLIST WISHLIST & EXPORT
  // ==========================================
  function updateWishCount(list) {
    const el = document.getElementById("wishCount");
    if (el) el.textContent = list.length;
  }

  function renderWishlist() {
    const container = document.getElementById("wishlistContainer");
    if (!container) return;
    container.innerHTML = "";

    chrome.storage.local.get(["fitList"], (result) => {
      const list = result.fitList || [];
      updateWishCount(list);

      if (list.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#6b7280; margin-top:20px;">No saved clothes yet! Click '+ Save to FitList' on product badges.</div>`;
        return;
      }

      list.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "wishlist-item";
        
        const noteHtml = item.note 
          ? `<div class="note-box">${item.note}</div>` 
          : ``;

        // Monetize saved eBay URLs automatically
        let targetUrl = item.url;
        if (targetUrl.includes("ebay.com") && !targetUrl.includes("_campid=")) {
          targetUrl += (targetUrl.includes("?") ? "&" : "?") + `_campid=${EBAY_CAMP_ID}&_toolid=10001`;
        }

        div.innerHTML = `
          <div class="wishlist-header">
            <a href="${targetUrl}" target="_blank" title="${item.title}">${item.title}</a>
            <button class="remove-btn" title="Remove">×</button>
          </div>
          <div style="font-size:10px; color:#6b7280; margin-top:2px;">Matched: ${item.matches.join(", ")}</div>
          ${noteHtml}
          <button class="note-btn">${item.note ? "✎ Edit Note" : "+ Add Note"}</button>
        `;

        // Remove Item
        div.querySelector(".remove-btn").addEventListener("click", () => {
          list.splice(index, 1);
          chrome.storage.local.set({ fitList: list }, renderWishlist);
        });

        // Add / Edit Note
        div.querySelector(".note-btn").addEventListener("click", () => {
          const customNote = prompt("Add a note for this item:", item.note || "");
          if (customNote !== null) {
            list[index].note = customNote.trim();
            chrome.storage.local.set({ fitList: list }, renderWishlist);
          }
        });

        container.appendChild(div);
      });
    });
  }

  // Export as CSV
  const csvBtn = document.getElementById("exportCsvBtn");
  if (csvBtn) {
    csvBtn.addEventListener("click", () => {
      chrome.storage.local.get(["fitList"], (result) => {
        const list = result.fitList || [];
        if (list.length === 0) return alert("Your FitList is empty!");

        let csvContent = "Title,URL,Matches,Note,Date Saved\n";
        list.forEach((item) => {
          const cleanTitle = `"${(item.title || "").replace(/"/g, '""')}"`;
          const cleanUrl = `"${item.url}"`;
          const cleanMatches = `"${item.matches.join(" | ")}"`;
          const cleanNote = `"${(item.note || "").replace(/"/g, '""')}"`;
          const cleanDate = `"${item.date || ""}"`;
          csvContent += `${cleanTitle},${cleanUrl},${cleanMatches},${cleanNote},${cleanDate}\n`;
        });

        downloadFile(csvContent, "fitlist-export.csv", "text/csv;charset=utf-8;");
      });
    });
  }

  // Export as JSON
  const jsonBtn = document.getElementById("exportJsonBtn");
  if (jsonBtn) {
    jsonBtn.addEventListener("click", () => {
      chrome.storage.local.get(["fitList"], (result) => {
        const list = result.fitList || [];
        if (list.length === 0) return alert("Your FitList is empty!");

        const jsonContent = JSON.stringify(list, null, 2);
        downloadFile(jsonContent, "fitlist-backup.json", "application/json;charset=utf-8;");
      });
    });
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
});