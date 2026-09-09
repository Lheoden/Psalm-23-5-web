Psalm 23:5 - separated frontend

Separated:
- Inline <style> blocks -> Assets/Css/<page>.css
- Main inline application JavaScript -> Assets/Js/<page>.js
- HTML structure remains in each page.
- Tailwind CDN configuration stays in HTML because it configures the CDN.
- External library scripts stay in HTML.
- Existing application code was not intentionally rewritten.

Pages:
- Admin/Admin.html
- Cashier/cashier.html
- Bar/Bar.html
- Kiosk/Kiosk.html

Test each page before changing logic.
