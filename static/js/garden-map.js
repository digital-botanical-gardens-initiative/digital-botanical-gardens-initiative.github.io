(function () {
  function initGardenMap(container) {
    if (!container || !window.L || container.dataset.ready === "true" || !container.dataset.gardens) return;

    var gardens = JSON.parse(container.dataset.gardens || "[]").filter(function (garden) {
      return Number.isFinite(Number(garden.latitude)) && Number.isFinite(Number(garden.longitude));
    });

    container.dataset.ready = "true";
    var map = L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var markerStyle = {
      radius: 8,
      color: "#26490d",
      weight: 2,
      fillColor: "#26490d",
      fillOpacity: 0.82
    };

    var points = gardens.map(function (garden) {
      var marker = L.circleMarker([Number(garden.latitude), Number(garden.longitude)], markerStyle).addTo(map);
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
        stats.textContent = garden.samples.toLocaleString() + " samples / "
          + garden.species.toLocaleString() + " species";
        popup.appendChild(stats);
      }

      if (garden.url) {
        var page = document.createElement("a");
        page.href = "/gardens/" + garden.key + "/";
        page.textContent = "View garden";
        popup.appendChild(page);

        var link = document.createElement("a");
        link.href = garden.url;
        link.textContent = "Visit website";
        link.rel = "noopener";
        link.target = "_blank";
        popup.appendChild(link);
      }

      marker.bindPopup(popup);
      return marker.getLatLng();
    });

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
    } else if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      map.setView([48.6, 8.1], 5);
    }
  }

  document.querySelectorAll(".dbgi-garden-map[data-gardens]").forEach(initGardenMap);
})();
