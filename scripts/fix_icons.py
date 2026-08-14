from PIL import Image
import os

img = Image.open('frontend/images/logo.png')
# Save 32x32 PNG as icon.png in app directory
img.resize((32, 32), Image.Resampling.LANCZOS).save('seal/app/icon.png', format='PNG')
img.resize((32, 32), Image.Resampling.LANCZOS).save('police-console/app/icon.png', format='PNG')

# Save ICO to public
img.resize((32, 32), Image.Resampling.LANCZOS).save('seal/public/favicon.ico', format='ICO')
img.resize((32, 32), Image.Resampling.LANCZOS).save('police-console/public/favicon.ico', format='ICO')

# Remove app/favicon.ico if exists to let app/icon.png handle it
for f in ['seal/app/favicon.ico', 'police-console/app/favicon.ico']:
    if os.path.exists(f):
        os.remove(f)

print('Icons configured cleanly!')
