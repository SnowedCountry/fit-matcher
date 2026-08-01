(function () {
  let badgeShown = false;

  chrome.storage.local.get(["measurements", "tolerance", "ignoreWords"], (result) => {
    const user = result.measurements;
    if (!user) return;
    const maxTolerance = result.tolerance !== undefined ? result.tolerance : 1.5;
    const ignoreWords = result.ignoreWords || "";

    // 1. Scan immediately
    scanAndHighlight(user, maxTolerance, ignoreWords);

    // 2. Scan again after 1.5 seconds for dynamic AJAX loading
    setTimeout(() => scanAndHighlight(user, maxTolerance, ignoreWords), 1500);

    // 3. Watch for DOM changes if the badge hasn't appeared yet
    const observer = new MutationObserver(() => {
      if (!badgeShown) {
        scanAndHighlight(user, maxTolerance, ignoreWords);
      } else {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  function scanAndHighlight(user, maxTol, ignoreWords) {
    if (badgeShown || !document.body) return;

    // A. Check Blacklist / Ignore Words in Title & Headers
    if (ignoreWords) {
      const bannedList = ignoreWords.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
      const pageHeader = (document.title + " " + document.body.innerText.slice(0, 1500)).toLowerCase();
      for (const banned of bannedList) {
        if (pageHeader.includes(banned)) {
          console.log(`[FitMatcher] Aborted: Found ignored keyword '${banned}'.`);
          return;
        }
      }
    }

    // B. Highlight matching rows in HTML tables (Size Guides)
    highlightTableRows(user, maxTol);

    const pageText = document.body.innerText;
    const matchedMetrics = [];
    let maxDifference = 0;

    // Evaluates regex matches with automatic CM to INCH conversion
    function evaluateMatch(keywordRegex, targetValue, label) {
      if (!targetValue) return;
      let match;
      while ((match = keywordRegex.exec(pageText)) !== null) {
        let foundValue = parseFloat(match[1]);
        const unitTag = (match[2] || "").toLowerCase();

        // Convert centimeters to inches if 'cm' is detected or number > 50
        if (unitTag.includes("cm") || unitTag.includes("centimeter") || foundValue > 50) {
          foundValue = parseFloat((foundValue / 2.54).toFixed(1));
        }

        const diff = Math.abs(foundValue - targetValue);
        if (diff <= maxTol) {
          if (!matchedMetrics.some((m) => m.startsWith(label))) {
            matchedMetrics.push(`${label} (${foundValue}" / Your: ${targetValue}")`);
            if (diff > maxDifference) maxDifference = diff;
          }
          break;
        }
      }
    }

    // 1. Bottoms Keywords ("Waist: 33", "Inseam: 30 cm", "Size: 33")
    evaluateMatch(/(?:waist|waist\s*size|size)[^0-9]{0,25}(\d+(?:\.\d+)?)\s*(cm|centimeters|in|inches|'')?/gi, user.waist, "Waist");
    evaluateMatch(/(?:inseam|length|inside\s*leg)[^0-9]{0,25}(\d+(?:\.\d+)?)\s*(cm|centimeters|in|inches|'')?/gi, user.inseam, "Inseam");

    // 2. Denim WxL Patterns ("33x30", "33 x 30", "33/30", "33W x 30L", "W33 L30")
    if (user.waist && user.inseam) {
      const wxlRegex = /(\d+(?:\.\d+)?)\s*(?:[wW]\s*)?[xX×\/]\s*(?:[lL]\s*)?(\d+(?:\.\d+)?)/g;
      let match;
      while ((match = wxlRegex.exec(pageText)) !== null) {
        const foundW = parseFloat(match[1]);
        const foundI = parseFloat(match[2]);
        const diffW = Math.abs(foundW - user.waist);
        const diffI = Math.abs(foundI - user.inseam);

        if (diffW <= maxTol && diffI <= maxTol) {
          if (!matchedMetrics.some((m) => m.startsWith("Waist"))) {
            matchedMetrics.push(`Waist (${foundW}" / Your: ${user.waist}")`);
          }
          if (!matchedMetrics.some((m) => m.startsWith("Inseam"))) {
            matchedMetrics.push(`Inseam (${foundI}" / Your: ${user.inseam}")`);
          }
          maxDifference = Math.max(maxDifference, diffW, diffI);
          break;
        }
      }
    }

    // 3. Tops & Outerwear ("pit to pit", "p2p", "chest", "shoulder", "sleeve")
    evaluateMatch(/(?:chest|pit[\s-]*to[\s-]*pit|p2p)[^0-9]{0,25}(\d+(?:\.\d+)?)\s*(cm|centimeters|in|inches|'')?/gi, user.chest, "Chest/P2P");
    evaluateMatch(/shoulder[^0-9]{0,25}(\d+(?:\.\d+)?)\s*(cm|centimeters|in|inches|'')?/gi, user.shoulder, "Shoulder");
    evaluateMatch(/sleeve[^0-9]{0,25}(\d+(?:\.\d+)?)\s*(cm|centimeters|in|inches|'')?/gi, user.sleeve, "Sleeve");

    if (matchedMetrics.length > 0) {
      badgeShown = true;
      showMatchBadge(matchedMetrics, maxDifference, maxTol);
    }
  }

  // Scans size chart tables and highlights matching rows
  function highlightTableRows(user, maxTol) {
    const rows = document.querySelectorAll("tr");
    rows.forEach((row) => {
      const text = row.innerText;
      const targets = [user.waist, user.inseam, user.chest, user.shoulder, user.sleeve].filter(Boolean);

      for (const target of targets) {
        // Look for numbers in the row
        const numbers = text.match(/\d+(?:\.\d+)?/g);
        if (!numbers) continue;

        for (let numStr of numbers) {
          let num = parseFloat(numStr);
          // Convert if chart is likely in cm (> 50 for clothing metrics)
          if (num > 50) num = parseFloat((num / 2.54).toFixed(1));

          if (Math.abs(num - target) <= maxTol) {
            row.style.backgroundColor = "#dcfce7"; // Soft green highlight
            row.style.outline = "2px solid #16a34a";
            break;
          }
        }
      }
    });
  }

  // Inject Graded Badge + FitList Save Button
  function showMatchBadge(matches, maxDiff, maxTol) {
    if (document.getElementById("fit-matcher-badge")) return;

    let badgeColor = "#16a34a"; // 🟢 Green (Exact Fit)
    let gradeLabel = "Exact Fit Match";
    if (maxDiff > maxTol * 0.66 && maxDiff > 0.2) {
      badgeColor = "#ea580c"; // 🟠 Orange (Borderline Fit)
      gradeLabel = "Borderline Fit Match";
    } else if (maxDiff > 0.2) {
      badgeColor = "#ca8a04"; // 🟡 Yellow/Gold (Relaxed Fit)
      gradeLabel = "Relaxed Fit Match";
    }

    const badge = document.createElement("div");
    badge.id = "fit-matcher-badge";
    badge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: ${badgeColor};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      width: 250px;
    `;

    badge.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; font-size:14px; margin-bottom:6px;">
        <span>✓ ${gradeLabel}</span>
        <span id="fm-close" style="cursor:pointer; opacity:0.8; font-size:16px;">×</span>
      </div>
      <div style="font-size:11px; line-height:1.4; margin-bottom:10px; background:rgba(0,0,0,0.15); padding:6px; border-radius:4px;">
        ${matches.join("<br>")}
      </div>
      <button id="fm-save-btn" style="
        width: 100%;
        padding: 6px;
        background: white;
        color: ${badgeColor};
        border: none;
        border-radius: 4px;
        font-weight: 700;
        cursor: pointer;
        font-size: 11px;
      ">
        + Save to FitList
      </button>
    `;

    document.body.appendChild(badge);

    document.getElementById("fm-close").addEventListener("click", () => {
      badge.remove();
    });

    document.getElementById("fm-save-btn").addEventListener("click", () => {
      const saveBtn = document.getElementById("fm-save-btn");
      chrome.storage.local.get(["fitList"], (result) => {
        const fitList = result.fitList || [];
        const currentUrl = window.location.href;

        if (!fitList.some((item) => item.url === currentUrl)) {
          fitList.push({
            title: document.title || "Saved Garment",
            url: currentUrl,
            matches: matches,
            note: "",
            date: new Date().toLocaleDateString()
          });
          chrome.storage.local.set({ fitList }, () => {
            saveBtn.textContent = "✓ Saved to FitList!";
            saveBtn.style.opacity = "0.8";
          });
        } else {
          saveBtn.textContent = "Already in FitList";
        }
      });
    });
  }
})();