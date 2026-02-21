from playwright.sync_api import sync_playwright
import time
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--use-gl=swiftshader',
                '--no-sandbox',
                '--enable-unsafe-swiftshader',
                '--disable-web-security',
                '--autoplay-policy=no-user-gesture-required'
            ]
        )
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("Navigating to http://localhost:5173/index.html")
        page.goto("http://localhost:5173/index.html")

        print("Waiting for #start-btn...")
        page.wait_for_selector("#start-btn", state="visible", timeout=30000)

        # Take a screenshot of landing page just in case
        page.screenshot(path="verification/landing.png")

        print("Clicking #start-btn via JS...")
        page.evaluate("document.getElementById('start-btn').click()")

        print("Waiting for #ui to become visible...")
        try:
            page.wait_for_selector("#ui.visible", timeout=60000)
            print("#ui is visible!")
        except Exception as e:
            print(f"Timeout waiting for #ui: {e}")
            page.screenshot(path="verification/ui_timeout.png")
            sys.exit(1)

        # Wait a bit for fade in
        time.sleep(2)

        # Verify specific control hints are present
        hints = page.locator("#controls-hint")
        if hints.is_visible():
            print("Control hints visible.")
            print(f"Text content: {hints.inner_text()}")
        else:
            print("Control hints NOT visible.")

        # Take final screenshot
        try:
            page.screenshot(path="verification/controls_ui.png", timeout=60000, animations="disabled", caret="hide")
            print("Screenshot saved to verification/controls_ui.png")
        except Exception as e:
            print(f"Screenshot failed: {e}")

        browser.close()

if __name__ == "__main__":
    run()
