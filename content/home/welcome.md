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
    - title: 👋 What is Digital Botanical Initiative ?
      content: Take a look at what we're working on...
      align: center
      background:
        position: right
        color: '#666'
        brightness: 0.7
        media: dbgi_metasequoia.jpeg
    # - title: Lunch & Learn ☕️
    #   content: 'Share your knowledge with the group and explore exciting new topics together!'
    #   align: left
    #   background:
    #     position: center
    #     color: '#555'
    #     brightness: 0.7
    #     media: contact.jpg
    - title: Who are we ?
      content: Meet the DBGI consortium !
      align: right
      background:
        position: center
        color: '#333'
        brightness: 0.2
        media: welcome.jpg
      link:
        icon: graduation-cap
        icon_pack: fas
        text: Join Us
        url: ../contact/
---
