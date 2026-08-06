(function () {
  function initNetworkMap(container) {
    if (!container || !window.L || container.dataset.ready === "true") return;

    var gardens = JSON.parse(container.dataset.gardens || "[]").filter(function (g) {
      return Number.isFinite(Number(g.latitude)) && Number.isFinite(Number(g.longitude));
    });
    var labs = JSON.parse(container.dataset.labs || "[]").filter(function (l) {
      return Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude));
    });

    container.dataset.ready = "true";
    var map = L.map(container, { scrollWheelZoom: false, zoomControl: true });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var points = [];

    gardens.forEach(function (garden) {
      var marker = L.circleMarker([Number(garden.latitude), Number(garden.longitude)], {
        radius: 8,
        color: "#26490d",
        weight: 2,
        fillColor: "#26490d",
        fillOpacity: 0.82
      }).addTo(map);

      var popup = document.createElement("div");
      popup.className = "dbgi-map-popup";
      var title = document.createElement("strong");
      title.textContent = garden.name;
      popup.appendChild(title);
      var place = document.createElement("span");
      place.textContent = garden.city + ", " + garden.country;
      popup.appendChild(place);

      if (garden.samples || garden.species) {
        var stats = document.createElement("span");
        stats.textContent = Number(garden.samples || 0).toLocaleString() + " samples / "
          + Number(garden.species || 0).toLocaleString() + " species";
        popup.appendChild(stats);
      }

      var page = document.createElement("a");
      page.href = "/gardens/" + garden.key + "/";
      page.textContent = "View garden";
      popup.appendChild(page);

      if (garden.url) {
        var link = document.createElement("a");
        link.href = garden.url;
        link.textContent = "Visit website";
        link.rel = "noopener";
        link.target = "_blank";
        popup.appendChild(link);
      }

      marker.bindPopup(popup);
      points.push(marker.getLatLng());
    });

    var labIcon = L.divIcon({
      className: "dbgi-network-map-lab-icon",
      html: '<span></span>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    labs.forEach(function (lab) {
      var marker = L.marker([Number(lab.latitude), Number(lab.longitude)], { icon: labIcon }).addTo(map);
      var popup = document.createElement("div");
      popup.className = "dbgi-map-popup";
      var title = document.createElement("strong");
      title.textContent = lab.short_name || lab.name;
      popup.appendChild(title);
      var place = document.createElement("span");
      place.textContent = lab.city + ", " + lab.country;
      popup.appendChild(place);
      var page = document.createElement("a");
      page.href = "/labs/" + lab.key + "/";
      page.textContent = "View lab";
      popup.appendChild(page);
      marker.bindPopup(popup);
      points.push(marker.getLatLng());
    });

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
    } else if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      map.setView([48.6, 8.1], 5);
    }
  }

  document.querySelectorAll(".dbgi-network-map[data-gardens]").forEach(initNetworkMap);
})();
