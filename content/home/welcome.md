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

content:
  slides:
    - title: 🪴 What is the Digital Botanical Gardens Initiative ?
      content: _An Open Science initiative to explore and establish robust and scalable workflows for the digitization of chemo- and biodiversity, from botanicals collections to the global scale in wild ecosystems._
      font_size: XS
      align: center
      background:
        position: right
        color: '#666'
        brightness: 0.7
        media: dbgi_metasequoia.jpeg
      link:
        icon: file
        icon_pack: fas
        text: Read the DBGI Green Paper
        url: http://www.dbgi.org/dbgi-green-paper/
    - title: 👋 Who are we ?
      content: Meet the DBGI consortium !
      align: right
      background:
        position: center
        color: '#333'
        brightness: 0.7
        media: morning_garden.jpg
      link:
        icon: users
        icon_pack: fas
        text: The people
        url: ../people/

---
