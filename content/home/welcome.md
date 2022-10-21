---
widget: slider
weight: 1
active: true
headless: true

design:
  # Slide height is automatic unless you force a specific height (e.g. '400px')
  slide_height: ''
  is_fullscreen: true
  # Automatically transition through slides?
  loop: false
  # Duration of transition between slides (in ms)
  interval: 2000

appearance:
  font_size: S

content:
  slides:
    - title: 👋 What is Digital Botanical Gardens Initiative ?
      content: The Digital Botanical Gardens Initiative (DBGI) ambitions to explore innovative solutions for the collection, management and sharing of digital information acquired on living botanical collections. A particular focus will be placed on the large scale characterization of the chemodiversity of living plants collections through mass spectrometric approaches. The acquired data will be structured, organized and connected with relevant metadata through semantic web technology. The gathered knowledge will then inform ecosystem functioning research and orient biodiversity conservation projects. The DBGI initially aims to take advantage of the readily available living collections of Swiss botanical gardens to establish robust and scalable chemo- and biodiversity digitisation workflows. The ultimate goal is to apply these approaches in the field and at the global scale in wild ecosystems.
      align: center
      background:
        position: right
        color: '#666'
        brightness: 0.7
        media: dbgi_metasequoia.jpeg
      link:
        icon: file
        icon_pack: fas
        text: Read the DBGI White Paper
        url: http://www.dbgi.org/dbgi-white-paper/
    - title: Who are we ?
      content: Meet the DBGI consortium !
      align: right
      background:
        position: center
        color: '#333'
        brightness: 0.7
        media: morning_garden.jpg
      link:
        icon: graduation-cap
        icon_pack: fas
        text: Join Us
        url: ../contact/

---
