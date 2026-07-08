(function () {
  function initLabMap(container) {
    if (!container || !window.L || container.dataset.ready === "true") return;

    var labs = JSON.parse(container.dataset.labs || "[]").filter(function (lab) {
      return Number.isFinite(Number(lab.latitude)) && Number.isFinite(Number(lab.longitude));
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
      radius: 9,
      color: "#26490d",
      weight: 2,
      fillColor: "#26490d",
      fillOpacity: 0.86
    };

    var points = labs.map(function (lab) {
      var marker = L.circleMarker([Number(lab.latitude), Number(lab.longitude)], markerStyle).addTo(map);
      var popup = document.createElement("div");
      popup.className = "dbgi-map-popup";

      var title = document.createElement("strong");
      title.textContent = lab.short_name || lab.name;
      popup.appendChild(title);

      var institution = document.createElement("span");
      institution.textContent = lab.institution;
      popup.appendChild(institution);

      var place = document.createElement("span");
      place.textContent = lab.city + ", " + lab.country;
      popup.appendChild(place);

      var page = document.createElement("a");
      page.href = "/labs/" + lab.key + "/";
      page.textContent = "View lab";
      popup.appendChild(page);

      if (lab.url) {
        var link = document.createElement("a");
        link.href = lab.url;
        link.textContent = "Visit website";
        link.rel = "noopener";
        link.target = "_blank";
        popup.appendChild(link);
      }

      marker.bindPopup(popup);
      return marker.getLatLng();
    });

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
    } else if (points.length === 1) {
      map.setView(points[0], 12);
    } else {
      map.setView([48.6, 8.1], 5);
    }
  }

  document.querySelectorAll(".dbgi-lab-map").forEach(initLabMap);
})();
