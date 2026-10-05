/* LoansFlow national directory — search, filter, render */
(function () {
  "use strict";

  const DATA_URL = "../data/directory.json";
  const grid = document.getElementById("dirGrid");
  const countEl = document.getElementById("resultCount");
  const searchInput = document.getElementById("searchInput");
  const stateSelect = document.getElementById("stateSelect");
  const chipBar = document.getElementById("chipBar");

  let data = null;
  let activeCategory = "all";
  let activeState = "";
  let searchTerm = "";

  function esc(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function textFor(item) {
    const parts = [item.name];
    if (item.category === "sba-district") {
      parts.push(item.states.join(" "));
      for (const loc of item.locations || []) {
        parts.push(loc.location, loc.address || "", loc.phone || "", loc.hours || "", loc.note || "");
      }
      if (item.director) parts.push(item.director);
    } else if (item.category === "national") {
      parts.push(item.phone || "", item.email || "", item.hours || "", item.note || "");
    } else if (item.category === "resource-partner") {
      parts.push(item.note || "");
    } else if (item.lenders || ["marketplace", "direct-lender", "bank"].includes(item.category)) {
      parts.push(item.products || "", item.details || "");
    }
    return parts.join(" ").toLowerCase();
  }

  function matches(item) {
    const haystack = textFor(item);
    if (searchTerm && !haystack.includes(searchTerm)) return false;
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
    if (activeState) {
      if (item.category === "sba-district") {
        if (!(item.states || []).includes(activeState)) return false;
      } else if (item.category === "national") {
        return false;
      } else if (item.locations) {
        const has = item.locations.some(function (loc) { return loc.state === activeState; });
        if (!has) return false;
      }
      return true;
    }
    return true;
  }

  function renderSbaCard(item) {
    var locationsHtml = item.locations.map(function (loc) {
      var noteHtml = loc.note ? '<div class="loc-note">' + esc(loc.note) + '</div>' : "";
      var addrHtml = loc.address ? '<div class="loc-addr">' + esc(loc.address) + "</div>" : "";
      var phoneHtml = loc.phone ? '<div class="loc-phone">Phone: ' + esc(loc.phone) + "</div>" : "";
      return '<div class="dir-location">' +
        '<div class="loc-name">' + esc(loc.location) + "</div>" +
        addrHtml + phoneHtml +
        '<div class="loc-hours">' + esc(loc.hours) + "</div>" +
        noteHtml +
        "</div>";
    }).join("");

    var statesLabel = (item.states || []).join(", ");

    return '<div class="dir-card">' +
      '<h3>' + esc(item.name) + '</h3>' +
      '<div class="dir-states">' + esc(statesLabel) + "</div>" +
      (item.director ? '<div class="dir-director">' + esc(item.director) + "</div>" : "") +
      '<div class="dir-locations">' + locationsHtml + "</div>" +
      '<a class="official-link" href="' + esc(item.url) + '" target="_blank" rel="noopener">Official SBA page →</a>' +
      "</div>";
  }

  function renderNationalCard(item) {
    var emailHtml = item.email ? '<div class="nat-email">Email: ' + esc(item.email) + "</div>" : "";
    var phoneHtml = item.phone ? '<div class="loc-phone">Phone: ' + esc(item.phone) + "</div>" : "";
    var hoursHtml = item.hours ? '<div class="nat-hours">' + esc(item.hours) + "</div>" : "";
    var noteHtml = item.note ? '<div class="nat-note">' + esc(item.note) + "</div>" : "";

    return '<div class="dir-card dir-national-card">' +
      '<h3>' + esc(item.name) + "</h3>" +
      phoneHtml + emailHtml + hoursHtml + noteHtml +
      (item.url ? '<a class="official-link" href="' + esc(item.url) + '" target="_blank" rel="noopener">Visit site →</a>' : "") +
      "</div>";
  }

  function renderPartnerCard(item) {
    return '<div class="dir-card dir-partner-card">' +
      '<h3>' + esc(item.name) + "</h3>" +
      '<div class="partner-note">' + esc(item.note || "") + "</div>" +
      (item.url ? '<a class="official-link" href="' + esc(item.url) + '" target="_blank" rel="noopener">Visit site →</a>' : "") +
      "</div>";
  }

  function renderLenderCard(item) {
    return '<div class="dir-card dir-lender-card">' +
      '<h3>' + esc(item.name) + "</h3>" +
      '<div class="lender-products">' + esc(item.products || "") + "</div>" +
      '<div class="lender-details">' + esc(item.details || "") + "</div>" +
      '<a class="lender-link" href="' + esc(item.url) + '" target="_blank" rel="sponsored noopener noreferrer">Visit site →</a>' +
      "</div>";
  }

  function renderItem(item) {
    if (item.category === "sba-district") return renderSbaCard(item);
    if (item.category === "national") return renderNationalCard(item);
    if (item.category === "resource-partner") return renderPartnerCard(item);
    return renderLenderCard(item);
  }

  function render() {
    if (!data) return;

    var combined = data.national.concat(data.offices).concat(data.partners).concat(data.lenders);
    var filtered = combined.filter(matches);

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="color:var(--muted);padding:1.5rem 0;">No listings match your filters.</div>';
      countEl.textContent = "Showing 0 of " + combined.length + " listings";
      return;
    }

    grid.innerHTML = filtered.map(renderItem).join("");
    countEl.textContent = "Showing " + filtered.length + " of " + combined.length + " listings";
  }

  function loadData() {
    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        data = json;
        render();
      })
      .catch(function (err) {
        grid.innerHTML = '<div style="color:var(--muted);padding:1.5rem 0;">Could not load directory data. If you are opening this file directly, try serving it over HTTP. (' + esc(err.message) + ')</div>';
        countEl.textContent = "";
      });
  }

  chipBar.addEventListener("click", function (e) {
    if (!e.target.classList.contains("chip")) return;
    chipBar.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
    e.target.classList.add("active");
    activeCategory = e.target.dataset.cat;
    render();
  });

  searchInput.addEventListener("input", function () {
    searchTerm = searchInput.value.trim().toLowerCase();
    render();
  });

  stateSelect.addEventListener("change", function () {
    activeState = stateSelect.value;
    render();
  });

  loadData();
})();
