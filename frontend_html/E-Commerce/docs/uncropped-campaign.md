# Campaign clarity correction

Images use intrinsic aspect ratios constrained by available width and height,
with object-fit:contain instead of cover. Fog and glass overlays on the image
are removed; edge fading is limited to a narrow perimeter. Text layout is retained.

Validation: 24 combinations of 3 slides, 2 themes and 4 viewport widths checked
for image containment, aspect ratio and no CSS blur. Daylight suite: 64 passed.

Built-in imagegen recomposed the portrait earbuds into two landscape assets:
- assets/images/campaign/cobalt-sound-wide.png
- assets/images/campaign/cobalt-sound-wide-day.png

Original images remain available. Only the main earbuds composition is used;
the small duplicate from the portrait is omitted.

## Final shared prompt

Recompose this reference into a LANDSCAPE 1536x1024 website product photograph. Preserve the exact PRIMARY large earbuds and open case design from the reference (the big upper product), its diagonal viewing angle and cobalt blue iris aesthetic. Remove the small duplicate earbuds at the bottom. Show ONE complete open charging case with both earbuds, fully inside the frame, generous safety margins of at least 15% on every side around the actual product. Place product toward center-right occupying roughly 50% of canvas width and 60% of height, surrounded by blue iris petals. Left third is smoothly fading empty background, no hard edges. Very crisp product and petal details, no mist, no blur over the product, no translucent overlays, no text, no watermark. 

Dark suffix: Near black #030407 background, blue highlights and natural dark shadows.

Light suffix: Very pale ice blue #f5f8fc background, natural clear daylight, retain dark navy product and vivid cobalt petals.
